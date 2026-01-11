import { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  owner_response: string | null;
  owner_response_at: string | null;
  created_at: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
}

interface SalonReviewsProps {
  salonId: string;
  salonName?: string;
}

export const SalonReviews = ({ salonId, salonName }: SalonReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ average: 0, count: 0 });
  const { user } = useAuth();

  useEffect(() => {
    fetchReviews();
  }, [salonId, salonName, user]);

  const fetchReviews = async () => {
    setLoading(true);
    
    let data: Review[] | null = null;
    let error = null;
    
    if (user) {
      // Authenticated users can use the full function with profile data
      const result = await supabase
        .rpc('get_salon_reviews_with_profiles', {
          p_salon_id: salonId,
          p_salon_name: salonName || null
        });
      data = result.data as Review[] | null;
      error = result.error;
    } else {
      // Anonymous users use the public function that hides user_id/booking_id
      const result = await supabase
        .rpc('get_reviews_public', {
          p_salon_id: salonId
        });
      data = result.data as Review[] | null;
      error = result.error;
    }

    if (!error && data) {
      setReviews(data);
      
      if (data.length > 0) {
        const avg = data.reduce((sum: number, r: Review) => sum + r.rating, 0) / data.length;
        setStats({ average: Math.round(avg * 10) / 10, count: data.length });
      }
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold mb-1">No Reviews Yet</h3>
        <p className="text-sm text-muted-foreground">
          Be the first to review this salon!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold">{stats.average}</span>
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.floor(stats.average)
                    ? 'fill-primary text-primary'
                    : 'text-muted-foreground'
                }`}
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{stats.count} reviews</p>
      </div>

      {/* Reviews List */}
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={review.reviewer_avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {review.reviewer_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">{review.reviewer_name}</h4>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(review.created_at), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                {review.review_text && (
                  <p className="text-sm text-muted-foreground">{review.review_text}</p>
                )}
                
                {/* Owner Response */}
                {review.owner_response && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/30 bg-muted/30 rounded-r-md p-3">
                    <p className="text-xs font-medium text-primary mb-1">Owner Response</p>
                    <p className="text-sm text-muted-foreground">{review.owner_response}</p>
                    {review.owner_response_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(review.owner_response_at), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
