import { toast } from "sonner";

const TMDB_API_KEY = "fa88d8b2833311dda328f176dcfd001a";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
  popularity: number;
}

export interface MovieDetails extends Movie {
  runtime: number;
  genres: { id: number; name: string }[];
  tagline: string;
  backdrop_path: string;
  popularity: number;
}

const fetchTMDB = async (endpoint: string) => {
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`;
  console.log(`Fetching TMDB endpoint: ${endpoint}`);
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.error(`TMDB API error: ${response.status} ${response.statusText}`);
    const errorData = await response.json();
    console.error('Error details:', errorData);
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

export const tmdb = {
  getImageUrl: (path: string, size: "w500" | "original" = "w500") =>
    `${IMAGE_BASE_URL}/${size}${path}`,

  async getTrending(): Promise<Movie[]> {
    try {
      const data = await fetchTMDB("/trending/movie/week");
      console.log("Fetched trending movies:", data.results.length);
      return data.results;
    } catch (error) {
      console.error("Error fetching trending movies:", error);
      toast.error("Failed to fetch trending movies");
      return [];
    }
  },

  async getMovieDetails(id: number): Promise<MovieDetails | null> {
    try {
      const data = await fetchTMDB(`/movie/${id}`);
      console.log("Fetched movie details:", data.title);
      return data;
    } catch (error) {
      console.error("Error fetching movie details:", error);
      toast.error("Failed to fetch movie details");
      return null;
    }
  },

  async searchMovies(query: string): Promise<Movie[]> {
    try {
      const data = await fetchTMDB(`/search/movie?query=${encodeURIComponent(query)}`);
      console.log("Search results:", data.results.length);
      return data.results;
    } catch (error) {
      console.error("Error searching movies:", error);
      toast.error("Failed to search movies");
      return [];
    }
  },

  async getMovieRecommendations(id: number): Promise<Movie[]> {
    try {
      const data = await fetchTMDB(`/movie/${id}/recommendations`);
      console.log("Fetched movie recommendations:", data.results.length);
      return data.results;
    } catch (error) {
      console.error("Error fetching movie recommendations:", error);
      toast.error("Failed to fetch movie recommendations");
      return [];
    }
  },
};
