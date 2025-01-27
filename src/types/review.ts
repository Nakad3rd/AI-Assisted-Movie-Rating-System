export interface Review {
  id: string;
  movieId: number;
  userId: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface MovieScore {
  rating: number;
  recommendationScore: number;
  totalReviews: number;
  sentimentScore: number;
}