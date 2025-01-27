import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Star, UserPlus, Shield, CheckCircle2, XCircle } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [authState, setAuthState] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthState("success");
        setTimeout(() => navigate("/"), 1000);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      if (event === "SIGNED_IN") {
        console.log("User signed in successfully");
        setAuthState("success");
        setTimeout(() => navigate("/"), 1000);
      }
      if (event === "SIGNED_OUT") {
        console.log("User signed out");
        setErrorMessage("");
        setAuthState("idle");
      }
      if (event === "USER_UPDATED") {
        const { error } = await supabase.auth.getSession();
        if (error) {
          console.error("Auth error:", error);
          setErrorMessage(getErrorMessage(error));
          setAuthState("error");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const getErrorMessage = (error: any) => {
    if (error.message.includes("Email not confirmed")) {
      return "Please verify your email address before signing in.";
    }
    if (error.message.includes("Invalid login credentials")) {
      return "Invalid email or password. Please check your credentials.";
    }
    return error.message;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-navy-light p-8 shadow-lg animate-fade-in">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {authState === "success" ? (
              <CheckCircle2 className="h-16 w-16 text-green-500 animate-scale-in" />
            ) : authState === "error" ? (
              <XCircle className="h-16 w-16 text-red-500 animate-scale-in" />
            ) : (
              <div className="relative">
                <Shield className="h-16 w-16 text-gold animate-pulse" />
                <Star className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-gold-light" />
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
            Rated-X
          </h1>
          <p className="text-gray-400">Your Ultimate Movie Rating Platform</p>
          <div className="flex justify-center space-x-4 text-gray-400">
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-1" />
              <span>Rate Movies</span>
            </div>
            <div className="flex items-center">
              <UserPlus className="h-4 w-4 mr-1" />
              <span>Join Community</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertDescription className="flex items-center">
              <XCircle className="h-4 w-4 mr-2" />
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-navy-darker rounded-lg p-6">
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#ffd700',
                    brandAccent: '#ffe44d',
                    inputBackground: '#1a2938',
                    inputText: 'white',
                    inputPlaceholder: '#9ca3af',
                  },
                },
              },
            }}
            providers={[]}
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;