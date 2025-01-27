import { Movie } from "@/services/tmdb";
import { MovieCard } from "./MovieCard";

interface MovieGridProps {
  movies: Movie[];
}

export const MovieGrid = ({ movies }: MovieGridProps) => {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 animate-fade-in opacity-0 delay-500">
      {movies.map((movie, index) => (
        <div
          key={movie.id}
          className="animate-fade-in opacity-0"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <MovieCard movie={movie} />
        </div>
      ))}
    </div>
  );
};