import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
}

export interface GroupAvailability {
  id: string;
  group_id: string;
  user_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
}

export const useGroups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    setGroups((data as Group[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (name: string, description?: string) => {
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("groups")
      .insert({ name, description: description || null, created_by: user.id })
      .select()
      .single();
    if (error) { toast.error("Failed to create group"); throw error; }
    await fetchGroups();
    return data as Group;
  };

  const deleteGroup = async (id: string) => {
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) { toast.error("Failed to delete group"); throw error; }
    await fetchGroups();
  };

  const getMembers = async (groupId: string): Promise<GroupMember[]> => {
    const { data, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId);
    if (error) throw error;
    return (data as GroupMember[]) || [];
  };

  const inviteMember = async (groupId: string, email: string) => {
    // Look up user by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .single();
    if (!profile) { toast.error("User not found"); return; }
    
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: profile.user_id, role: "member", status: "pending" });
    if (error) {
      if (error.code === "23505") toast.error("User already in group");
      else toast.error("Failed to invite");
      throw error;
    }
    toast.success("Invitation sent!");
  };

  const respondToInvite = async (memberId: string, accept: boolean) => {
    const { error } = await supabase
      .from("group_members")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", memberId);
    if (error) throw error;
    toast.success(accept ? "Joined group!" : "Invitation declined");
  };

  const getAvailability = async (groupId: string, date: string): Promise<GroupAvailability[]> => {
    const { data, error } = await supabase
      .from("group_availability")
      .select("*")
      .eq("group_id", groupId)
      .eq("available_date", date);
    if (error) throw error;
    return (data as GroupAvailability[]) || [];
  };

  const setAvailability = async (groupId: string, date: string, startTime: string, endTime: string, isAvailable: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from("group_availability")
      .insert({ group_id: groupId, user_id: user.id, available_date: date, start_time: startTime, end_time: endTime, is_available: isAvailable });
    if (error) throw error;
  };

  return { groups, loading, createGroup, deleteGroup, getMembers, inviteMember, respondToInvite, getAvailability, setAvailability, refetch: fetchGroups };
};
