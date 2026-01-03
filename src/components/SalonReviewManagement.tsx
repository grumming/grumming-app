import { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, Loader2, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  owner_response: string | null;
  owner_response_at: string | null;
  created_at: string;
  user_id: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
}

interface SalonReviewManagementProps {
  salonId: string;
  salonName?: string;
}

export const SalonReviewManagement = ({ salonId, salonName }: SalonReviewManagementProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [editingResponse, setEditingResponse] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ average: 0, count: 0, pending: 0 });

  useEffect(() => {
    fetchReviews();
  }, [salonId, salonName]);

  const fetchReviews = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .rpc('get_salon_reviews_with_profiles', {
        p_salon_id: salonId,
        p_salon_name: salonName || null
      });

    if (!error && data) {
      setReviews(data as Review[]);
      
      if (data.length > 0) {
        const avg = data.reduce((sum: number, r: Review) => sum + r.rating, 0) / data.length;
        const pending = data.filter((r: Review) => !r.owner_response).length;
        setStats({ 
          average: Math.round(avg * 10) / 10, 
          count: data.length,
          pending 
        });
      }
    }
    
    setLoading(false);
  };

  const handleRespond = async (reviewId: string, isEdit: boolean = false) => {
    if (!response.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setSubmitting(true);
    
    const { error } = await supabase
      .from('reviews')
      .update({
        owner_response: response.trim(),
        owner_response_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (error) {
      toast.error('Failed to submit response');
      console.error('Error submitting response:', error);
    } else {
      toast.success(isEdit ? 'Response updated successfully' : 'Response submitted successfully');
      setRespondingTo(null);
      setEditingResponse(null);
      setResponse('');
      fetchReviews();
    }
    
    setSubmitting(false);
  };

  const startEditing = (review: Review) => {
    setEditingResponse(review.id);
    setRespondingTo(null);
    setResponse(review.owner_response || '');
  };

  const cancelEditing = () => {
    setEditingResponse(null);
    setResponse('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No Reviews Yet</h3>
          <p className="text-sm text-muted-foreground">
            Customer reviews will appear here once they start coming in.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-2xl font-bold">{stats.average}</span>
              <Star className="w-5 h-5 fill-primary text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Average Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{stats.count}</p>
            <p className="text-xs text-muted-foreground">Total Reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending Response</p>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={review.reviewer_avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {review.reviewer_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{review.reviewer_name}</h4>
                      {!review.owner_response && (
                        <Badge variant="outline" className="text-xs">Needs Response</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(review.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-muted-foreground mb-3">{review.review_text}</p>
                  )}
                  
                  {/* Owner Response */}
                  {review.owner_response && editingResponse !== review.id ? (
                    <div className="pl-3 border-l-2 border-primary/30 bg-muted/30 rounded-r-md p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-primary">Your Response</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => startEditing(review)}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.owner_response}</p>
                      {review.owner_response_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(review.owner_response_at), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  ) : editingResponse === review.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Edit your response..."
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRespond(review.id, true)}
                          disabled={submitting || !response.trim()}
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <Send className="w-4 h-4 mr-1" />
                          )}
                          Update
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : respondingTo === review.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Write your response to this review..."
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRespond(review.id)}
                          disabled={submitting || !response.trim()}
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <Send className="w-4 h-4 mr-1" />
                          )}
                          Submit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRespondingTo(null);
                            setResponse('');
                          }}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRespondingTo(review.id)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Respond
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
