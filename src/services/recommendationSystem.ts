import { Movie, MovieDetails } from "./tmdb";
import { Review, MovieScore } from "@/types/review";
import { calculateAggregateScore } from "@/utils/sentimentAnalysis";
import { supabase } from "@/integrations/supabase/client";

// Weights for different factors in our recommendation algorithm
const WEIGHTS = {
  GENRE: 0.25,
  RATING: 0.2,
  POPULARITY: 0.15,
  RECENCY: 0.15,
  SENTIMENT: 0.25
};

interface MovieSimilarity {
  movie: Movie;
  score: number;
}

const calculateGenreSimilarity = (movie1: MovieDetails, movie2: Movie): number => {
  const movie1Genres = new Set(movie1.genres.map(g => g.id));
  const movie2Genres = new Set(movie2.genre_ids);
  
  const intersection = new Set([...movie1Genres].filter(x => movie2Genres.has(x)));
  const union = new Set([...movie1Genres, ...movie2Genres]);
  
  return intersection.size / union.size;
};

const calculateRatingSimilarity = (rating1: number, rating2: number): number => {
  const maxDiff = 10;
  return 1 - Math.abs(rating1 - rating2) / maxDiff;
};

const calculateRecencySimilarity = (date1: string, date2: string): number => {
  const year1 = new Date(date1).getFullYear();
  const year2 = new Date(date2).getFullYear();
  const maxYearDiff = 30;
  const yearDiff = Math.abs(year1 - year2);
  return Math.max(0, 1 - yearDiff / maxYearDiff);
};

const calculatePopularitySimilarity = (pop1: number, pop2: number): number => {
  const maxDiff = Math.max(pop1, pop2);
  return 1 - Math.abs(pop1 - pop2) / maxDiff;
};

const findSimilarUsers = async (userId: string, movieId: number): Promise<string[]> => {
  console.log("Finding similar users for:", { userId, movieId });
  
  try {
    // Get current user's ratings
    const { data: userRatings, error: userRatingsError } = await supabase
      .from('movie_ratings')
      .select('movie_id, rating')
      .eq('user_id', userId);

    if (userRatingsError) throw userRatingsError;

    // Get all other users who rated this movie
    const { data: otherUsersRatings, error: otherUsersError } = await supabase
      .from('movie_ratings')
      .select('user_id, movie_id, rating')
      .neq('user_id', userId);

    if (otherUsersError) throw otherUsersError;

    // Calculate similarity scores
    const userSimilarities = new Map<string, number>();
    
    otherUsersRatings.forEach(otherRating => {
      const matchingUserRating = userRatings?.find(r => r.movie_id === otherRating.movie_id);
      if (matchingUserRating) {
        const similarity = calculateRatingSimilarity(matchingUserRating.rating, otherRating.rating);
        const currentSimilarity = userSimilarities.get(otherRating.user_id) || 0;
        userSimilarities.set(otherRating.user_id, currentSimilarity + similarity);
      }
    });

    // Sort users by similarity and get top 5
    const similarUsers = Array.from(userSimilarities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId]) => userId);

    console.log("Found similar users:", similarUsers);
    return similarUsers;
  } catch (error) {
    console.error("Error finding similar users:", error);
    return [];
  }
};

const getSimilarUsersRatings = async (movieId: number, similarUsers: string[]): Promise<number[]> => {
  console.log("Getting ratings from similar users for movie:", movieId);
  
  try {
    const { data: ratings, error } = await supabase
      .from('movie_ratings')
      .select('rating')
      .eq('movie_id', movieId)
      .in('user_id', similarUsers);

    if (error) throw error;

    const userRatings = ratings?.map(r => r.rating) || [];
    console.log("Similar users ratings:", userRatings);
    return userRatings;
  } catch (error) {
    console.error("Error getting similar users ratings:", error);
    return [];
  }
};

export const calculateMovieScore = async (
  movie: MovieDetails,
  reviews: Review[] = [],
  userId?: string
): Promise<MovieScore> => {
  console.log(`Calculating comprehensive score for ${movie.title}`);

  try {
    // Get ML-generated recommendation score
    const { data: mlRecommendation, error } = await supabase
      .from('movie_recommendations')
      .select('score')
      .eq('movie_id', movie.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching ML recommendation:', error);
    }

    const mlScore = mlRecommendation?.score || 0;
    console.log('ML-generated recommendation score:', mlScore);

    // Calculate sentiment score from reviews
    const sentimentScore = calculateAggregateScore(reviews);
    console.log('Sentiment analysis score:', sentimentScore);

    // Get similar users ratings if userId is provided
    let similarUsersAverage = movie.vote_average;
    if (userId) {
      const similarUsers = await findSimilarUsers(userId, movie.id);
      const similarUsersRatings = await getSimilarUsersRatings(movie.id, similarUsers);
      if (similarUsersRatings.length > 0) {
        similarUsersAverage = similarUsersRatings.reduce((a, b) => a + b, 0) / similarUsersRatings.length;
      }
    }
    
    // Calculate popularity trend
    const popularityFactor = Math.min(movie.popularity / 100, 1);

    // Calculate final rating (0-10 scale) incorporating ML score
    const finalRating = (
      movie.vote_average * 0.2 +
      similarUsersAverage * 0.4 +
      sentimentScore * 10 * 0.2 +
      mlScore * 10 * 0.2
    );

    // Calculate recommendation score (0-100)
    const recommendationScore = Math.round(
      (finalRating / 10 * 40) +    // Base rating (40%)
      (popularityFactor * 20) +    // Popularity factor (20%)
      (sentimentScore * 20) +      // Sentiment factor (20%)
      (mlScore * 20)              // ML score (20%)
    );

    console.log('Score components:', {
      tmdbRating: movie.vote_average,
      similarUsersAverage,
      sentimentScore,
      mlScore,
      popularityFactor,
      finalRating,
      recommendationScore
    });

    return {
      rating: Number(finalRating.toFixed(1)),
      recommendationScore: Math.min(100, recommendationScore),
      totalReviews: reviews.length,
      sentimentScore
    };
  } catch (error) {
    console.error('Error calculating movie score:', error);
    return {
      rating: movie.vote_average,
      recommendationScore: 0,
      totalReviews: 0,
      sentimentScore: 0
    };
  }
};

export const enhanceRecommendations = (
  currentMovie: MovieDetails,
  recommendations: Movie[],
  reviews: Review[] = []
): Movie[] => {
  console.log("Enhancing recommendations for:", currentMovie.title);

  const movieScores: MovieSimilarity[] = recommendations.map(movie => {
    const genreSimilarity = calculateGenreSimilarity(currentMovie, movie);
    const ratingSimilarity = calculateRatingSimilarity(
      currentMovie.vote_average,
      movie.vote_average
    );
    const recencySimilarity = calculateRecencySimilarity(
      currentMovie.release_date,
      movie.release_date
    );
    const popularitySimilarity = calculatePopularitySimilarity(
      currentMovie.popularity,
      movie.popularity
    );

    const totalScore = 
      genreSimilarity * WEIGHTS.GENRE +
      ratingSimilarity * WEIGHTS.RATING +
      recencySimilarity * WEIGHTS.RECENCY +
      popularitySimilarity * WEIGHTS.POPULARITY;

    console.log(`Similarity scores for ${movie.title}:`, {
      genreSimilarity,
      ratingSimilarity,
      recencySimilarity,
      popularitySimilarity,
      totalScore,
    });

    return { movie, score: totalScore };
  });

  return movieScores
    .sort((a, b) => b.score - a.score)
    .map(item => item.movie);
};
