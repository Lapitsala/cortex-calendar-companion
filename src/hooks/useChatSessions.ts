import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ChatSession {
  id: string;
  title: string;
  status: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export const useChatSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) { console.error(error); return; }
    setSessions((data as ChatSession[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
    const channel = supabase
      .channel("chat_sessions_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, () => fetchSessions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSessions]);

  const createSession = async (title = "New Chat") => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ title, user_id: user?.id })
      .select()
      .single();
    if (error) throw error;
    const created = data as ChatSession;
    setSessions((prev) => [created, ...prev]);
    return created;
  };

  const updateSession = async (id: string, updates: Partial<ChatSession>) => {
    await supabase
      .from("chat_sessions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
  };

  const deleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("chat_messages").delete().eq("session_id", id);
    await supabase.from("chat_sessions").delete().eq("id", id);
  };

  const getMessages = async (sessionId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data as ChatMessage[]) || [];
  };

  const addMessage = async (sessionId: string, role: "user" | "assistant", content: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ session_id: sessionId, role, content })
      .select()
      .single();
    if (error) throw error;
    if (role === "user") {
      const title = content.length > 40 ? content.slice(0, 40) + "..." : content;
      await supabase
        .from("chat_sessions")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    return data as ChatMessage;
  };

  // Cleanup: remove empty sessions (no messages) with no meaningful interaction.
  const cleanupEmptySessions = async (activeSessionId?: string) => {
    for (const session of sessions) {
      if (session.id === activeSessionId) continue;
      const msgs = await getMessages(session.id);
      const hasMeaningfulInteraction = msgs.some((m) => m.role === "user" && m.content.trim().length > 0);
      if (!hasMeaningfulInteraction) {
        await deleteSession(session.id);
      }
    }
  };

  return { sessions, loading, createSession, updateSession, deleteSession, getMessages, addMessage, cleanupEmptySessions, refetch: fetchSessions };
};
