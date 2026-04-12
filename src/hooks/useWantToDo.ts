import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface WantToDoItem {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  is_completed: boolean;
  deadline: string | null;
  deadline_time: string | null;
  priority: "high" | "medium" | "low";
  synced_event_id: string | null;
  created_at: string;
  updated_at: string;
}

const LOCAL_KEY = "preview_want_to_do";

const loadLocal = (): WantToDoItem[] => {
  const raw = localStorage.getItem(LOCAL_KEY);
  return raw ? JSON.parse(raw) : [];
};
const saveLocal = (items: WantToDoItem[]) => localStorage.setItem(LOCAL_KEY, JSON.stringify(items));

export const useWantToDo = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<WantToDoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setItems(loadLocal());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("want_to_do")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setItems((data as WantToDoItem[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (item: Pick<WantToDoItem, "title" | "description" | "deadline" | "deadline_time" | "priority">) => {
    if (!isSupabaseConfigured) {
      const created: WantToDoItem = {
        ...item,
        id: crypto.randomUUID(),
        user_id: null,
        is_completed: false,
        synced_event_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const next = [created, ...items];
      setItems(next);
      saveLocal(next);
      return created;
    }
    const { data, error } = await supabase
      .from("want_to_do")
      .insert({ ...item, user_id: user?.id })
      .select()
      .single();
    if (error) { toast.error("Failed to create item"); throw error; }
    await fetch();
    return data as WantToDoItem;
  };

  const update = async (id: string, updates: Partial<WantToDoItem>) => {
    if (!isSupabaseConfigured) {
      const next = items.map(i => i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } : i);
      setItems(next);
      saveLocal(next);
      return;
    }
    const { error } = await supabase.from("want_to_do").update(updates).eq("id", id);
    if (error) { toast.error("Failed to update"); throw error; }
    await fetch();
  };

  const remove = async (id: string) => {
    if (!isSupabaseConfigured) {
      const next = items.filter(i => i.id !== id);
      setItems(next);
      saveLocal(next);
      return;
    }
    const { error } = await supabase.from("want_to_do").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); throw error; }
    await fetch();
  };

  return { items, loading, create, update, remove, refetch: fetch };
};
