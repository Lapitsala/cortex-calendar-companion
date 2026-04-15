import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface GroupEvent {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface GroupEventResponse {
  id: string;
  group_event_id: string;
  user_id: string;
  response: "accepted" | "declined" | "maybe";
  created_at: string;
  display_name?: string | null;
  email?: string | null;
}

export const useGroupEvents = () => {
  const { user } = useAuth();
  const [groupEvents, setGroupEvents] = useState<GroupEvent[]>([]);
  const [eventResponses, setEventResponses] = useState<GroupEventResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGroupEvents = useCallback(async (groupId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("group_events")
        .select("*")
        .eq("group_id", groupId)
        .order("event_date", { ascending: true });
      if (error) throw error;

      const events = (data || []) as GroupEvent[];

      // Fetch creator profiles
      const creatorIds = [...new Set(events.map(e => e.created_by))];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", creatorIds);
        if (profiles) {
          const map = new Map(profiles.map(p => [p.user_id, p]));
          events.forEach(e => {
            const p = map.get(e.created_by);
            e.creator_name = p?.display_name || p?.email || e.created_by.slice(0, 8);
          });
        }
      }

      setGroupEvents(events);
    } catch (err) {
      console.error("Failed to fetch group events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEventResponses = useCallback(async (eventId: string) => {
    const { data, error } = await supabase
      .from("group_event_responses")
      .select("*")
      .eq("group_event_id", eventId);
    if (error) throw error;

    const responses = (data || []) as GroupEventResponse[];

    // Fetch profiles
    const userIds = responses.map(r => r.user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);
      if (profiles) {
        const map = new Map(profiles.map(p => [p.user_id, p]));
        responses.forEach(r => {
          const p = map.get(r.user_id);
          r.display_name = p?.display_name;
          r.email = p?.email;
        });
      }
    }

    setEventResponses(responses);
    return responses;
  }, []);

  const createGroupEvent = async (
    groupId: string,
    event: { title: string; description?: string; event_date: string; start_time: string; end_time?: string; location?: string }
  ) => {
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("group_events")
      .insert({
        group_id: groupId,
        created_by: user.id,
        title: event.title,
        description: event.description || null,
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time || null,
        location: event.location || null,
      })
      .select()
      .single();
    if (error) { toast.error("Failed to create group event"); throw error; }
    toast.success("Group event created! Members will be notified.");
    return data;
  };

  const respondToEvent = async (eventId: string, response: "accepted" | "declined" | "maybe") => {
    if (!user) return;

    // Upsert response
    const { data: existing } = await supabase
      .from("group_event_responses")
      .select("id")
      .eq("group_event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("group_event_responses")
        .update({ response })
        .eq("id", existing.id);
      if (error) { toast.error("Failed to update response"); throw error; }
    } else {
      const { error } = await supabase
        .from("group_event_responses")
        .insert({ group_event_id: eventId, user_id: user.id, response });
      if (error) { toast.error("Failed to respond"); throw error; }
    }

    // If accepted, add to personal calendar
    if (response === "accepted") {
      const event = groupEvents.find(e => e.id === eventId);
      if (event) {
        // Check if already in calendar
        const { data: existingCal } = await supabase
          .from("calendar_events")
          .select("id")
          .eq("user_id", user.id)
          .eq("title", event.title)
          .eq("event_date", event.event_date)
          .eq("start_time", event.start_time)
          .maybeSingle();

        if (!existingCal) {
          await supabase.from("calendar_events").insert({
            user_id: user.id,
            title: event.title,
            description: event.description,
            event_date: event.event_date,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            priority: "medium",
          });
          toast.success("Event added to your calendar!");
        }
      }
    }

    const label = response === "accepted" ? "ตกลง" : response === "declined" ? "ไม่ตกลง" : "ไม่แน่ใจ";
    toast.success(`Responded: ${label}`);
  };

  const deleteGroupEvent = async (eventId: string) => {
    const { error } = await supabase.from("group_events").delete().eq("id", eventId);
    if (error) { toast.error("Failed to delete event"); throw error; }
    toast.success("Group event deleted");
  };

  return {
    groupEvents, eventResponses, loading,
    fetchGroupEvents, fetchEventResponses,
    createGroupEvent, respondToEvent, deleteGroupEvent,
  };
};
