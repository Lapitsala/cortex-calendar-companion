import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import TypingIndicator from "@/components/TypingIndicator";
import ChatHistoryPanel from "@/components/chat/ChatHistoryPanel";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const ChatPage = () => {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  const { sessions, createSession, updateSession, deleteSession, getMessages, addMessage, cleanupEmptySessions } = useChatSessions();
  const { events, createEvent } = useCalendarEvents();

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle "Chat about this event" from calendar
  useEffect(() => {
    const eventName = searchParams.get("event");
    if (eventName) {
      handleSend(`Tell me about my event "${eventName}"`);
    }
  }, []);

  // Load or create session on mount
  useEffect(() => {
    const initSession = async () => {
      if (sessions.length > 0 && !activeSessionId) {
        const incomplete = sessions.find(s => s.status === "incomplete");
        if (incomplete) {
          loadSession(incomplete.id);
        } else {
          startNewChat();
        }
      } else if (sessions.length === 0 && !activeSessionId) {
        startNewChat();
      }
    };
    initSession();
  }, [sessions]);

  const startNewChat = async () => {
    // Cleanup empty sessions before creating new one
    await cleanupEmptySessions(activeSessionId || undefined);
    const session = await createSession();
    setActiveSessionId(session.id);
    setMessages([
      { id: "welcome", role: "assistant", content: "Hey! I'm **Cortex**, your AI calendar assistant. How can I help you today? ✨" }
    ]);
    setShowHistory(false);
  };

  const loadSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    const msgs = await getMessages(sessionId);
    if (msgs.length === 0) {
      setMessages([
        { id: "welcome", role: "assistant", content: "Hey! I'm **Cortex**, your AI calendar assistant. How can I help you today? ✨" }
      ]);
    } else {
      setMessages(msgs.map(m => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
    }
    setShowHistory(false);
  };

  const parseEventActions = (text: string) => {
    const regex = /\[EVENT_CREATE\]([\s\S]*?)\[\/EVENT_CREATE\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        const eventData = JSON.parse(match[1]);
        createEvent({
          title: eventData.title || "Untitled Event",
          description: eventData.description || null,
          event_date: eventData.date || new Date().toISOString().split("T")[0],
          start_time: eventData.start_time || eventData.time || "12:00 PM",
          end_time: eventData.end_time || null,
          location: eventData.location || null,
          priority: eventData.priority || "medium",
        });
        toast.success(`Event "${eventData.title}" added to calendar!`);
      } catch (e) {
        console.error("Failed to parse event action:", e);
      }
    }
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    // Ensure we have a session
    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = await createSession();
      sessionId = session.id;
      setActiveSessionId(sessionId);
    }

    const userMsg: LocalMessage = { id: Date.now().toString(), role: "user", content: msg };
    const updatedMessages = [...messages.filter(m => m.id !== "welcome"), userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Save user message to DB
    await addMessage(sessionId, "user", msg);

    let assistantSoFar = "";

    // Build calendar context
    const upcomingEvents = events.slice(0, 20).map(e =>
      `- ${e.title} on ${e.event_date} at ${e.start_time}${e.location ? ` (${e.location})` : ""} [${e.priority}]`
    ).join("\n");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          calendarContext: upcomingEvents,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        const content = assistantSoFar;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id === "streaming") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { id: "streaming", role: "assistant", content }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Finalize streaming message
      setMessages(prev =>
        prev.map(m => m.id === "streaming" ? { ...m, id: Date.now().toString() } : m)
      );

      // Save assistant message to DB
      if (assistantSoFar) {
        await addMessage(sessionId, "assistant", assistantSoFar);
        // Parse for event creation actions
        parseEventActions(assistantSoFar);
      }
    } catch (e: any) {
      console.error("Chat error:", e);
      toast.error(e.message || "Failed to get response");
      if (!assistantSoFar) {
        setMessages(prev => prev.filter(m => m.id !== userMsg.id));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Schedule a meeting tomorrow at 3 PM", icon: "📅" },
    { label: "What's on my calendar this week?", icon: "🗓️" },
    { label: "Help me plan my study schedule", icon: "🎯" },
  ];

  const handleDeleteSessionConfirm = async () => {
    if (!deleteSessionTarget) return;
    await deleteSession(deleteSessionTarget);
    if (deleteSessionTarget === activeSessionId) {
      startNewChat();
    }
    setDeleteSessionTarget(null);
    toast.success("Chat deleted");
  };

  const handleBulkDelete = async (ids: string[]) => {
    for (const id of ids) {
      await deleteSession(id);
    }
    if (ids.includes(activeSessionId || "")) {
      startNewChat();
    }
    toast.success(`${ids.length} chat${ids.length > 1 ? "s" : ""} deleted`);
  };

  const handleBulkArchive = async (ids: string[]) => {
    for (const id of ids) {
      await updateSession(id, { status: "archived" });
    }
    toast.success(`${ids.length} chat${ids.length > 1 ? "s" : ""} archived`);
  };

  // Clean display text (remove event action markers)
  const cleanContent = (text: string) => text.replace(/\[EVENT_CREATE\][\s\S]*?\[\/EVENT_CREATE\]/g, "").trim();

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => setShowHistory(true)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform">
          <Menu className="w-4 h-4 text-foreground" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-base font-bold text-foreground">Cortex</h1>
          <p className="text-[11px] text-muted-foreground">AI Calendar Assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-40">
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className="max-w-[80%]">
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-md"
                    : "bg-card border border-border rounded-tl-md text-foreground"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5">
                      <ReactMarkdown>{cleanContent(m.content)}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}

        {/* Quick actions */}
        {messages.length <= 1 && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-2 pt-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => handleSend(a.label)}
                className="bg-card border border-border rounded-full px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 p-3 bg-card/90 backdrop-blur-xl border-t border-border z-20">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <div className="flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask Cortex anything..."
              disabled={isLoading}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 transition-opacity glow-primary active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat History Panel */}
      <ChatHistoryPanel
        open={showHistory}
        onClose={() => setShowHistory(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={loadSession}
        onNewChat={startNewChat}
        onDeleteSession={(id) => setDeleteSessionTarget(id)}
        onArchiveSession={(id) => updateSession(id, { status: "archived" })}
      />

      {/* Delete session confirmation */}
      <DeleteConfirmDialog
        open={!!deleteSessionTarget}
        title="Delete Chat"
        message="Are you sure you want to delete this chat session? All messages will be lost."
        onConfirm={handleDeleteSessionConfirm}
        onCancel={() => setDeleteSessionTarget(null)}
      />
    </div>
  );
};

export default ChatPage;
