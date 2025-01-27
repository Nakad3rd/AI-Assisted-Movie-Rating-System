import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, movieId } = await req.json();
    console.log(`Generating recommendations for user ${userId} and movie ${movieId}`);

    // Get user's ratings and preferences
    const { data: userRatings, error: ratingsError } = await supabase
      .from('movie_ratings')
      .select('*')
      .eq('user_id', userId);

    if (ratingsError) {
      console.error('Error fetching user ratings:', ratingsError);
      throw ratingsError;
    }

    const { data: userPreferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (preferencesError) {
      console.error('Error fetching user preferences:', preferencesError);
      throw preferencesError;
    }

    // Calculate recommendation score based on user history and preferences
    const calculateScore = () => {
      let score = 0.5; // Base score starts at 0.5 (50%)

      // Adjust score based on user ratings history
      if (userRatings && userRatings.length > 0) {
        const averageRating = userRatings.reduce((acc, curr) => acc + curr.rating, 0) / userRatings.length;
        score += (averageRating / 10) * 0.3; // Normalize rating to 0-1 scale and weight it
      }

      // Adjust score based on user preferences
      if (userPreferences?.favorite_genres?.length > 0) {
        score += 0.1; // Add small boost for having preferences set
      }

      return Math.min(Math.max(score, 0), 1); // Ensure score is between 0 and 1
    };

    const score = calculateScore();
    console.log('Generated recommendation score:', score);

    // Use upsert to handle both insert and update cases
    const { data: recommendation, error: upsertError } = await supabase
      .from('movie_recommendations')
      .upsert(
        {
          user_id: userId,
          movie_id: movieId,
          score: score,
        },
        {
          onConflict: 'user_id,movie_id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting recommendation:', upsertError);
      throw upsertError;
    }

    console.log('Successfully stored recommendation:', recommendation);

    return new Response(
      JSON.stringify(recommendation),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error in generate-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});