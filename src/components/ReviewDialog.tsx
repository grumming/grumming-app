import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  salonId: string;
  salonName: string;
  userId: string;
  onReviewSubmitted: () => void;
}

export const ReviewDialog = ({
  open,
  onOpenChange,
  bookingId,
  salonId,
  salonName,
  userId,
  onReviewSubmitted,
}: ReviewDialogProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Please select a rating',
        description: 'Tap on the stars to rate your experience.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('reviews').insert({
      user_id: userId,
      booking_id: bookingId,
      salon_id: salonId,
      rating,
      review_text: reviewText.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Already reviewed',
          description: 'You have already submitted a review for this booking.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to submit review. Please try again.',
          variant: 'destructive',
        });
      }
      return;
    }

    toast({
      title: 'Review submitted!',
      description: 'Thank you for your feedback.',
    });

    setRating(0);
    setReviewText('');
    onOpenChange(false);
    onReviewSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            How was your visit to <span className="font-semibold">{salonName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <p className="text-center text-sm text-muted-foreground mb-4">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent!'}
            </p>
          )}

          {/* Review Text */}
          <Textarea
            placeholder="Share your experience (optional)..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            maxLength={500}
            className="min-h-[100px] resize-none"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {reviewText.length}/500
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
