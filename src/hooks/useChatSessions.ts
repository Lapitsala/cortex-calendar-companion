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

const GUEST_SESSION_IDS_KEY = "guest_chat_session_ids";

const hasGuestSessionStore = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GUEST_SESSION_IDS_KEY) !== null;
};

const readGuestSessionIds = (): string[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(GUEST_SESSION_IDS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return Array.from(new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0)));
  } catch {
    return [];
  }
};

const writeGuestSessionIds = (ids: string[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_SESSION_IDS_KEY, JSON.stringify(Array.from(new Set(ids))));
};

const rememberGuestSessionIds = (ids: string[]) => {
  if (ids.length === 0) return;
  writeGuestSessionIds([...readGuestSessionIds(), ...ids]);
};

const forgetGuestSessionId = (id: string) => {
  writeGuestSessionIds(readGuestSessionIds().filter((savedId) => savedId !== id));
};

export const useChatSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);

    let data: ChatSession[] | null = null;
    let error: unknown = null;

    if (user) {
      const response = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      data = (response.data as ChatSession[]) || [];
      error = response.error;
    } else {
      const guestIds = readGuestSessionIds();

      if (guestIds.length > 0) {
        const response = await supabase
          .from("chat_sessions")
          .select("*")
          .is("user_id", null)
          .in("id", guestIds)
          .order("updated_at", { ascending: false });

        data = (response.data as ChatSession[]) || [];
        error = response.error;
      } else if (hasGuestSessionStore()) {
        data = [];
      } else {
        const response = await supabase
          .from("chat_sessions")
          .select("*")
          .is("user_id", null)
          .order("updated_at", { ascending: false });

        data = (response.data as ChatSession[]) || [];
        error = response.error;
      }
    }

    if (error) {
      console.error("Failed to fetch chat sessions:", error);
      setLoading(false);
      return;
    }

    const nextSessions = data || [];

    if (!user) {
      writeGuestSessionIds(nextSessions.map((session) => session.id));
    }

    setSessions(nextSessions);
    setLoading(false);
  }, [user]);

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

    if (!user) {
      rememberGuestSessionIds([created.id]);
    }

    setSessions((prev) => [created, ...prev.filter((session) => session.id !== created.id)]);
    return created;
  };

  const updateSession = async (id: string, updates: Partial<ChatSession>) => {
    await supabase
      .from("chat_sessions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
  };

  const deleteSession = async (id: string) => {
    const previousSessions = sessions;
    setSessions((prev) => prev.filter((session) => session.id !== id));

    try {
      const { error: msgErr } = await supabase
        .from("chat_messages")
        .delete()
        .eq("session_id", id);

      if (msgErr) throw msgErr;

      const { data: deletedRows, error: sessErr } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", id)
        .select("id");

      if (sessErr) throw sessErr;

      const deleted = Array.isArray(deletedRows) && deletedRows.some((row) => row.id === id);

      if (!deleted) {
        const { data: existingRow, error: verifyErr } = await supabase
          .from("chat_sessions")
          .select("id")
          .eq("id", id)
          .maybeSingle();

        if (verifyErr) throw verifyErr;
        if (existingRow) throw new Error("Chat session still exists after delete attempt");
      }

      if (!user) {
        forgetGuestSessionId(id);
      }

      await fetchSessions();
    } catch (error) {
      console.error("Failed to delete chat session:", error);
      setSessions(previousSessions);
      await fetchSessions();
      throw error;
    }
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
