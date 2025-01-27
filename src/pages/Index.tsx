import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/services/tmdb";
import { MovieGrid } from "@/components/MovieGrid";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["trending-movies"],
    queryFn: () => tmdb.getTrending(),
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-navy px-4 py-8 flex flex-col">
      <div className="mx-auto max-w-7xl flex-grow">
        <div className="mb-8 flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-full flex justify-end">
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="text-gold hover:text-gold-light hover:bg-navy-light"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
          <h1 className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-center text-5xl font-bold text-transparent">
            Rated-X
          </h1>
          <p className="text-gray-400 animate-fade-in opacity-0 delay-200">
            Your Ultimate Movie Rating Destination
          </p>
          <div className="w-full max-w-xl animate-fade-in opacity-0 delay-300">
            <SearchBar />
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-gold border-t-transparent"></div>
          </div>
        ) : (
          <MovieGrid movies={movies} />
        )}
      </div>
      <footer className="mt-8 text-center text-sm text-gray-400">
        © 2025 Chukwuemeka Raphael. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;