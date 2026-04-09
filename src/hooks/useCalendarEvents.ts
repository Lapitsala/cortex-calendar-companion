import { useState, useEffect, useCallback, useRef } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
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

const LOCAL_KEY = "preview_calendar_events";

const loadLocalEvents = (): CalendarEvent[] => {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (raw) return JSON.parse(raw) as CalendarEvent[];

  const today = new Date();
  const format = (d: Date) => d.toISOString().split("T")[0];
  const defaults: CalendarEvent[] = [
    {
      id: crypto.randomUUID(),
      title: "Welcome to Cortex Preview",
      description: "This demo event appears when Supabase keys are not configured.",
      event_date: format(today),
      start_time: "09:00",
      end_time: "10:00",
      location: "Local preview mode",
      priority: "medium",
      user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(LOCAL_KEY, JSON.stringify(defaults));
  return defaults;
};

const saveLocalEvents = (events: CalendarEvent[]) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(events));
};

export const useCalendarEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setEvents(loadLocalEvents());
      setLoading(false);
      return;
    }

    try {
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
    } catch (e) {
      console.error("Failed to fetch events:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();

    if (!isSupabaseConfigured) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `cal_events_${user?.id || 'anon'}_${Date.now()}`;
    const channel = supabase.channel(channelName);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "calendar_events" },
      () => fetchEvents()
    );
    channel.subscribe();
    channelRef.current = channel;
    } catch (e) {
      console.error("Realtime subscription error:", e);
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, fetchEvents]);

  const createEvent = async (event: Omit<CalendarEvent, "id" | "created_at" | "updated_at" | "user_id">) => {
    if (!isSupabaseConfigured) {
      const created: CalendarEvent = {
        ...event,
        id: crypto.randomUUID(),
        user_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const next = [...events, created].sort((a, b) => a.event_date.localeCompare(b.event_date));
      setEvents(next);
      saveLocalEvents(next);
      return created;
    }

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
    if (!isSupabaseConfigured) {
      const next = events.map((event) =>
        event.id === id ? { ...event, ...updates, updated_at: new Date().toISOString() } : event,
      );
      setEvents(next);
      saveLocalEvents(next);
      return;
    }

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
    if (!isSupabaseConfigured) {
      const next = events.filter((event) => event.id !== id);
      setEvents(next);
      saveLocalEvents(next);
      return;
    }

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

  return { events, loading, createEvent, updateEvent, deleteEvent, getEventsForDate, refetch: fetchEvents, isPreviewMode: !isSupabaseConfigured };
};
