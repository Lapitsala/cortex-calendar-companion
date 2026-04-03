import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ShareLevel = "availability_only" | "limited" | "full";

export interface CalendarShare {
  id: string;
  owner_id: string;
  shared_with_id: string;
  share_level: ShareLevel;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarShareWithProfile extends CalendarShare {
  owner_name?: string;
  owner_email?: string;
  shared_with_name?: string;
  shared_with_email?: string;
}

export const useCalendarShares = () => {
  const { user } = useAuth();
  const [sharedByMe, setSharedByMe] = useState<CalendarShareWithProfile[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<CalendarShareWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShares = useCallback(async () => {
    if (!user) return;

    // Shares I created
    const { data: byMe } = await supabase
      .from("calendar_shares")
      .select("*")
      .eq("owner_id", user.id);

    // Shares shared with me
    const { data: withMe } = await supabase
      .from("calendar_shares")
      .select("*")
      .eq("shared_with_id", user.id);

    // Enrich with profile data
    const enrichShares = async (shares: any[], lookupField: "owner_id" | "shared_with_id") => {
      if (!shares || shares.length === 0) return [];
      const userIds = [...new Set(shares.map(s => lookupField === "owner_id" ? s.shared_with_id : s.owner_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      
      return shares.map(s => {
        const targetId = lookupField === "owner_id" ? s.shared_with_id : s.owner_id;
        const profile = profileMap.get(targetId) as any;
        return {
          ...s,
          ...(lookupField === "owner_id"
            ? { shared_with_name: profile?.display_name, shared_with_email: profile?.email }
            : { owner_name: profile?.display_name, owner_email: profile?.email }),
        };
      });
    };

    setSharedByMe(await enrichShares(byMe || [], "owner_id"));
    setSharedWithMe(await enrichShares(withMe || [], "shared_with_id"));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchShares(); }, [fetchShares]);

  const shareCalendar = async (email: string, level: ShareLevel) => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("user_id").eq("email", email).single();
    if (!profile) { toast.error("User not found"); return; }
    if (profile.user_id === user.id) { toast.error("Can't share with yourself"); return; }

    const { error } = await supabase
      .from("calendar_shares")
      .insert({ owner_id: user.id, shared_with_id: profile.user_id, share_level: level });
    if (error) {
      if (error.code === "23505") toast.error("Already shared with this user");
      else toast.error("Failed to share");
      return;
    }
    toast.success("Calendar shared!");
    fetchShares();
  };

  const respondToShare = async (shareId: string, accept: boolean) => {
    const { error } = await supabase
      .from("calendar_shares")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", shareId);
    if (error) throw error;
    toast.success(accept ? "Share accepted!" : "Share declined");
    fetchShares();
  };

  const revokeShare = async (shareId: string) => {
    const { error } = await supabase.from("calendar_shares").delete().eq("id", shareId);
    if (error) throw error;
    toast.success("Share revoked");
    fetchShares();
  };

  const updateShareLevel = async (shareId: string, level: ShareLevel) => {
    const { error } = await supabase
      .from("calendar_shares")
      .update({ share_level: level })
      .eq("id", shareId);
    if (error) throw error;
    toast.success("Share level updated");
    fetchShares();
  };

  return { sharedByMe, sharedWithMe, loading, shareCalendar, respondToShare, revokeShare, updateShareLevel, refetch: fetchShares };
};
