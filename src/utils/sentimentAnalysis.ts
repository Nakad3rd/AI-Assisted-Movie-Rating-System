import { Review } from "@/types/review";

export const analyzeSentiment = (text: string): number => {
  const positiveWords = [
    'great', 'awesome', 'excellent', 'good', 'love', 'amazing', 'fantastic',
    'brilliant', 'outstanding', 'perfect', 'masterpiece', 'wonderful',
    'enjoyed', 'best', 'recommend'
  ];
  const negativeWords = [
    'bad', 'poor', 'terrible', 'awful', 'hate', 'disappointing', 'boring',
    'waste', 'worst', 'mediocre', 'horrible', 'unwatchable', 'skip',
    'bland', 'forgettable'
  ];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  let totalMatches = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) {
      score += 1;
      totalMatches++;
    }
    if (negativeWords.includes(word)) {
      score -= 1;
      totalMatches++;
    }
  });

  // If no sentiment words found, return neutral score
  if (totalMatches === 0) return 0.5;

  // Normalize score to 0-1 range
  return (score / totalMatches + 1) / 2;
};

export const calculateAggregateScore = (reviews: Review[]): number => {
  if (reviews.length === 0) return 0.5;

  const sentimentScores = reviews.map(review => ({
    sentiment: analyzeSentiment(review.content),
    rating: review.rating / 10 // Normalize rating to 0-1 range
  }));

  // Weight both sentiment and rating equally
  const aggregateScore = sentimentScores.reduce((acc, curr) => 
    acc + (curr.sentiment * 0.5 + curr.rating * 0.5), 0) / reviews.length;

  console.log('Review analysis:', {
    totalReviews: reviews.length,
    sentimentScores,
    aggregateScore
  });

  return aggregateScore;
};