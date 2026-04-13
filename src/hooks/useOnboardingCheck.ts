import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useOnboardingCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setChecking(false);
      setNeedsOnboarding(false);
      return;
    }

    const check = async () => {
      try {
        const { data, error } = await (supabase.from("user_preferences" as any) as any)
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Onboarding check error:", error);
          setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(!data || !data.onboarding_completed);
        }
      } catch {
        setNeedsOnboarding(false);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [user, authLoading]);

  return { needsOnboarding, checking };
};
