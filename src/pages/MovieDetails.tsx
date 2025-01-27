import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tmdb, type MovieDetails as TMDBMovieDetails } from "@/services/tmdb";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Star } from "lucide-react";
import { MovieGrid } from "@/components/MovieGrid";
import { ReviewSection } from "@/components/ReviewSection";
import { calculateMovieScore, enhanceRecommendations } from "@/services/recommendationSystem";
import { Review } from "@/types/review";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";

type MovieRating = Database['public']['Tables']['movie_ratings']['Row'];

const MovieDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: movie, isLoading: isLoadingMovie } = useQuery({
    queryKey: ["movie", id],
    queryFn: () => tmdb.getMovieDetails(Number(id)),
    enabled: !!id,
  });

  const { data: recommendations = [], isLoading: isLoadingRecommendations } = useQuery({
    queryKey: ["movie-recommendations", id],
    queryFn: async () => {
      const rawRecommendations = await tmdb.getMovieRecommendations(Number(id));
      if (movie && user) {
        console.log("Applying enhanced recommendation algorithm with user:", user.id);
        const enhancedRecommendations = await Promise.all(
          rawRecommendations.map(async (rec) => {
            const score = await calculateMovieScore(rec as TMDBMovieDetails, [], user.id);
            return {
              ...rec,
              vote_average: score.rating,
            };
          })
        );
        return enhancedRecommendations;
      }
      return rawRecommendations;
    },
    enabled: !!id && !!movie && !!user,
  });

  // Subscribe to real-time rating updates
  useEffect(() => {
    if (!id) return;

    console.log("Setting up real-time subscription for movie ratings");

    const channel = supabase
      .channel('movie-ratings')
      .on<MovieRating>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movie_ratings',
          filter: `movie_id=eq.${id}`,
        },
        async (payload) => {
          console.log("Received real-time update:", payload);
          
          if (!payload.new || typeof payload.new !== 'object') {
            console.error("Invalid payload received");
            return;
          }

          const newRating = payload.new as MovieRating;
          
          try {
            console.log("Generating new recommendations for:", {
              userId: newRating.user_id,
              movieId: newRating.movie_id
            });

            const { data, error } = await supabase.functions.invoke('generate-recommendations', {
              body: { 
                userId: newRating.user_id,
                movieId: newRating.movie_id,
              },
            });

            if (error) throw error;

            console.log("Generated new recommendation:", data);
            
            // Invalidate recommendations cache to trigger refresh
            queryClient.invalidateQueries({ queryKey: ["movie-recommendations", id] });
            
            toast({
              title: "Recommendations updated",
              description: "New personalized recommendations have been generated.",
            });
          } catch (error) {
            console.error("Error generating recommendation:", error);
            toast({
              title: "Error updating recommendations",
              description: "Failed to generate new recommendations.",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [id, queryClient, toast]);

  const handleReviewSubmit = async (review: Review) => {
    console.log("Submitting review:", review);
    
    try {
      const { error } = await supabase
        .from('movie_ratings')
        .upsert({
          user_id: review.userId,
          movie_id: review.movieId,
          rating: review.rating,
          review: review.content,
        });

      if (error) throw error;

      toast({
        title: "Review submitted",
        description: "Your review has been saved and will help improve recommendations.",
      });
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error submitting review",
        description: "Failed to save your review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSearchClick = () => {
    navigate('/search');
  };

  if (isLoadingMovie) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <div className="text-white">Movie not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      <div className="fixed top-0 right-0 z-50 p-4">
        <Button
          variant="outline"
          onClick={handleSearchClick}
          className="text-gold hover:text-gold-light hover:bg-navy-light"
        >
          <Search className="mr-2 h-4 w-4" />
          Search Movies
        </Button>
      </div>
      <div
        className="relative h-[60vh] bg-cover bg-center"
        style={{
          backgroundImage: `url(${tmdb.getImageUrl(
            movie.backdrop_path,
            "original"
          )})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row">
              <img
                src={tmdb.getImageUrl(movie.poster_path)}
                alt={movie.title}
                className="h-[400px] rounded-lg object-cover shadow-xl"
              />
              <div className="flex flex-col justify-end gap-4 text-white md:ml-8">
                <h1 className="text-4xl font-bold">{movie.title}</h1>
                {movie.tagline && (
                  <p className="text-xl italic text-gray-300">{movie.tagline}</p>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-gold text-gold" />
                    <span className="text-lg">{movie.vote_average.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{movie.release_date.split("-")[0]}</span>
                  <span>•</span>
                  <span>{movie.runtime} min</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="rounded-full bg-navy-light px-4 py-1"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl p-8">
        <div className="rounded-lg bg-navy-light p-6 text-white">
          <h2 className="mb-4 text-2xl font-bold">Overview</h2>
          <p className="text-gray-300">{movie.overview}</p>
        </div>

        <ReviewSection 
          movieId={movie.id} 
          onReviewSubmit={handleReviewSubmit}
        />

        {recommendations.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-2xl font-bold text-white">
              Recommended Movies
            </h2>
            <MovieGrid movies={recommendations} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetails;
