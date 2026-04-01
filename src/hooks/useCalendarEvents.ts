import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  priority: "high" | "medium" | "low";
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useCalendarEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });
    if (error) {
      console.error("Error fetching events:", error);
      setLoading(false);
      return;
    }
    setEvents((data as CalendarEvent[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const channelName = `calendar_events_realtime_${user?.id ?? "anonymous"}_${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => fetchEvents())
      .subscribe();

    fetchEvents();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents, user?.id]);

  const createEvent = async (event: Omit<CalendarEvent, "id" | "created_at" | "updated_at" | "user_id">) => {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({ ...event, user_id: user?.id })
      .select()
      .single();
    if (error) {
      toast.error("Failed to create event");
      throw error;
    }
    return data as CalendarEvent;
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    const { error } = await supabase
      .from("calendar_events")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update event");
      throw error;
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete event");
      throw error;
    }
  };

  const getEventsForDate = useCallback((date: string) => {
    return events.filter(e => e.event_date === date);
  }, [events]);

  return { events, loading, createEvent, updateEvent, deleteEvent, getEventsForDate, refetch: fetchEvents };
};
