import { useState } from "react";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Review } from "@/types/review";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ReviewSectionProps {
  movieId: number;
  onReviewSubmit: (review: Review) => void;
}

export const ReviewSection = ({ movieId, onReviewSubmit }: ReviewSectionProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting your review",
        variant: "destructive",
      });
      return;
    }

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to submit a review",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);

    try {
      // First, save the review to the database
      const { error: ratingError } = await supabase
        .from('movie_ratings')
        .upsert({
          user_id: session.user.id,
          movie_id: movieId,
          rating: rating,
          review: review,
        });

      if (ratingError) throw ratingError;

      // Then, generate new recommendations
      const { error: recommendationError } = await supabase.functions.invoke('generate-recommendations', {
        body: { 
          userId: session.user.id,
          movieId: movieId,
        },
      });

      if (recommendationError) throw recommendationError;

      // Create the review object for the UI
      const newReview: Review = {
        id: crypto.randomUUID(),
        movieId,
        userId: session.user.id,
        rating,
        content: review,
        createdAt: new Date().toISOString(),
      };

      await onReviewSubmit(newReview);
      
      setRating(0);
      setReview("");
      
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback! Your recommendations have been updated.",
      });
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8 rounded-lg bg-navy-light p-6">
      <h3 className="mb-4 text-xl font-bold text-white">Write a Review</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <button
              key={value}
              type="button"
              className="transition-transform hover:scale-110"
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(value)}
            >
              <Star
                className={`h-6 w-6 ${
                  value <= (hoveredRating || rating)
                    ? "fill-gold text-gold"
                    : "text-gray-400"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-white">{rating.toFixed(1)}</span>
          )}
        </div>
        <Textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Share your thoughts about this movie..."
          className="min-h-[100px] bg-navy-darker text-white placeholder:text-gray-400"
        />
        <Button 
          type="submit" 
          className="bg-gold text-navy hover:bg-gold/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </Button>
      </form>
    </div>
  );
};

export default ReviewSection;