import { Movie } from "@/services/tmdb";
import { tmdb } from "@/services/tmdb";
import { Star, ThumbsUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { calculateMovieScore } from "@/services/recommendationSystem";

interface MovieCardProps {
  movie: Movie;
}

export const MovieCard = ({ movie }: MovieCardProps) => {
  const { data: movieDetails } = useQuery({
    queryKey: ['movie-details', movie.id],
    queryFn: () => tmdb.getMovieDetails(movie.id),
    enabled: !!movie.id,
  });

  const { data: movieScore } = useQuery({
    queryKey: ['movie-score', movie.id],
    queryFn: async () => {
      if (!movieDetails) {
        return {
          rating: movie.vote_average,
          recommendationScore: 0,
          totalReviews: 0,
          sentimentScore: 0
        };
      }
      const score = await calculateMovieScore(movieDetails);
      return score;
    },
    enabled: !!movieDetails,
  });

  // Fallback values if score is not available
  const defaultScore = {
    rating: movie.vote_average,
    recommendationScore: 0,
    totalReviews: 0,
    sentimentScore: 0
  };

  const score = movieScore || defaultScore;

  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group relative overflow-hidden rounded-lg bg-navy-light transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gold/20"
    >
      <div className="aspect-[2/3] w-full overflow-hidden">
        <img
          src={tmdb.getImageUrl(movie.poster_path)}
          alt={movie.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute bottom-0 p-4 text-white">
          <h3 className="mb-2 text-lg font-bold transform transition-transform duration-300 group-hover:translate-y-0 translate-y-4">
            {movie.title}
          </h3>
          <div className="flex items-center gap-4 transform transition-transform duration-300 group-hover:translate-y-0 translate-y-4 delay-100">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-gold text-gold animate-pulse" />
              <span>{score.rating.toFixed(1)}</span>
            </div>
            {score.recommendationScore > 0 && (
              <div className="flex items-center gap-1">
                <ThumbsUp 
                  className={`h-4 w-4 ${
                    score.recommendationScore >= 70 
                      ? 'text-green-500' 
                      : 'text-gray-400'
                  }`} 
                />
                <span>{score.recommendationScore}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};