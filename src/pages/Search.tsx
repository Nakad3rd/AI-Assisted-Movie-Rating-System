import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/services/tmdb";
import { MovieGrid } from "@/components/MovieGrid";
import { SearchBar } from "@/components/SearchBar";
import { useSearchParams } from "react-router-dom";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["search-movies", query],
    queryFn: () => tmdb.searchMovies(query),
    enabled: !!query,
  });

  return (
    <div className="min-h-screen bg-navy px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-center gap-4">
          <SearchBar />
          <h2 className="text-center text-2xl text-white">
            Search results for: <span className="font-bold">{query}</span>
          </h2>
        </div>
        {isLoading ? (
          <div className="text-center text-white">Loading...</div>
        ) : (
          <MovieGrid movies={movies} />
        )}
      </div>
    </div>
  );
};

export default Search;