import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, Menu, Camera, Image as ImageIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import TypingIndicator from "@/components/TypingIndicator";
import ChatHistoryPanel from "@/components/chat/ChatHistoryPanel";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useGroups } from "@/hooks/useGroups";
import { useCalendarShares } from "@/hooks/useCalendarShares";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const ChatPage = () => {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();

  const { sessions, loading: sessionsLoading, createSession, updateSession, deleteSession, getMessages, addMessage, cleanupEmptySessions } = useChatSessions();
  const { events, createEvent } = useCalendarEvents();
  const { groups, getMembers } = useGroups();
  const { sharedWithMe } = useCalendarShares();

  const welcomeMessage: LocalMessage = {
    id: "welcome",
    role: "assistant",
    content: "Hey! I'm **Cortex**, your AI calendar assistant. How can I help you today? ✨\n\nYou can also send me a photo 📸 of a schedule, flyer, or assignment and I'll extract the event details for you!"
  };

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle "Chat about this event" from calendar
  useEffect(() => {
    const eventName = searchParams.get("event");
    if (eventName && initialized) {
      handleSend(`Tell me about my event "${eventName}"`);
    }
  }, [initialized]);

  // Initialize once when sessions finish loading
  useEffect(() => {
    if (sessionsLoading || initialized) return;

    const init = async () => {
      if (sessions.length > 0) {
        const incomplete = sessions.find(s => s.status === "incomplete");
        if (incomplete) {
          await loadSession(incomplete.id);
        } else {
          setMessages([welcomeMessage]);
        }
      } else {
        setMessages([welcomeMessage]);
      }
      setInitialized(true);
    };
    init();
  }, [sessionsLoading, initialized]);

  const startNewChat = useCallback(async () => {
    setActiveSessionId(null);
    setMessages([welcomeMessage]);
    setShowHistory(false);
  }, []);

  const loadSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    const msgs = await getMessages(sessionId);
    if (msgs.length === 0) {
      setMessages([welcomeMessage]);
    } else {
      setMessages(msgs.map(m => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
    }
    setShowHistory(false);
  };

  const parseEventActions = async (text: string) => {
    const regex = /\[EVENT_CREATE\]([\s\S]*?)\[\/EVENT_CREATE\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        const eventData = JSON.parse(match[1]);
        const convertTime = (t: string) =>
          t.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/i, (_: string, h: string, m: string, ap: string) => {
            let hour = parseInt(h);
            if (ap.toUpperCase() === "PM" && hour !== 12) hour += 12;
            if (ap.toUpperCase() === "AM" && hour === 12) hour = 0;
            return `${hour.toString().padStart(2, "0")}:${m}`;
          });

        await createEvent({
          title: eventData.title || "Untitled Event",
          description: eventData.description || null,
          event_date: eventData.date || new Date().toISOString().split("T")[0],
          start_time: eventData.start_time ? convertTime(eventData.start_time) : "09:00",
          end_time: eventData.end_time ? convertTime(eventData.end_time) : null,
          location: eventData.location || null,
          priority: eventData.priority || "medium",
        });
        toast.success(`✅ Event "${eventData.title}" added to your calendar!`);
      } catch (e) {
        console.error("Failed to auto-create event:", e);
        toast.error("Failed to create event from AI response");
      }
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 1024;
          let { width, height } = img;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) { height = (height / width) * MAX_SIZE; width = MAX_SIZE; }
            else { width = (width / height) * MAX_SIZE; height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Image too large. Max 20MB."); return; }
    try {
      setPendingImage(await compressImage(file));
      setShowAttachMenu(false);
    } catch { toast.error("Failed to process image"); }
    e.target.value = "";
  };

  const buildGroupContext = async () => {
    if (groups.length === 0) return "";
    const parts: string[] = [];
    for (const g of groups) {
      const members = await getMembers(g.id);
      const memberList = members.map(m => `${m.user_id.slice(0, 8)} (${m.role}, ${m.status})`).join(", ");
      parts.push(`Group "${g.name}": ${members.length} members [${memberList}]`);
    }
    return "\n\nUser's groups:\n" + parts.join("\n");
  };

  const buildSharedCalendarContext = async () => {
    const accepted = sharedWithMe.filter(s => s.status === "accepted");
    if (accepted.length === 0) return "";
    const parts: string[] = [];
    for (const share of accepted) {
      const ownerName = share.owner_name || share.owner_email || share.owner_id.slice(0, 8);
      const { data: sharedEvents } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", share.owner_id)
        .order("event_date", { ascending: true })
        .limit(30);
      if (sharedEvents && sharedEvents.length > 0) {
        const eventList = sharedEvents.map((e: any) =>
          `  - ${e.title} on ${e.event_date} at ${e.start_time}${e.end_time ? `-${e.end_time}` : ""}${e.location ? ` (${e.location})` : ""} [${e.priority}]`
        ).join("\n");
        parts.push(`${ownerName}'s calendar (shared with you, level: ${share.share_level}):\n${eventList}`);
      } else {
        parts.push(`${ownerName}'s calendar (shared with you): no upcoming events`);
      }
    }
    return "\n\nShared calendars (personal sharing, NOT groups):\n" + parts.join("\n\n");
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    const hasImage = !!pendingImage;
    if (!msg && !hasImage) return;
    if (isLoading) return;

    // Ensure session
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await createSession();
        sessionId = session.id;
        setActiveSessionId(sessionId);
      } catch (e) {
        console.error("Failed to create session:", e);
        toast.error("Failed to start chat session");
        return;
      }
    }

    const displayContent = hasImage && msg ? msg : hasImage ? "📸 Analyze this image for event details" : msg;
    const userMsg: LocalMessage = {
      id: Date.now().toString(),
      role: "user",
      content: displayContent,
      imageUrl: pendingImage || undefined,
    };
    const updatedMessages = [...messages.filter(m => m.id !== "welcome"), userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setPendingImage(null);
    setIsLoading(true);

    await addMessage(sessionId, "user", displayContent);

    let assistantSoFar = "";

    const upcomingEvents = events.slice(0, 20).map(e =>
      `- ${e.title} on ${e.event_date} at ${e.start_time}${e.location ? ` (${e.location})` : ""} [${e.priority}]`
    ).join("\n");

    // Build group context for scheduling
    const groupContext = await buildGroupContext();

    const apiMessages = updatedMessages.map(m => {
      if (m.imageUrl) {
        const content: any[] = [];
        content.push({ type: "text", text: m.content && m.content !== "📸 Analyze this image for event details" ? m.content : "Please analyze this image and extract any event details." });
        content.push({ type: "image_url", image_url: { url: m.imageUrl } });
        return { role: m.role, content };
      }
      return { role: m.role, content: m.content };
    });

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          calendarContext: upcomingEvents + groupContext,
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

      setMessages(prev =>
        prev.map(m => m.id === "streaming" ? { ...m, id: Date.now().toString() } : m)
      );

      if (assistantSoFar) {
        await addMessage(sessionId, "assistant", assistantSoFar);
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
    { label: "Find a common time for Cortext-Team", icon: "👥" },
  ];

  const handleDeleteSessionConfirm = async () => {
    if (!deleteSessionTarget) return;
    try {
      await deleteSession(deleteSessionTarget);
      if (deleteSessionTarget === activeSessionId) {
        await startNewChat();
      }
      toast.success("Chat deleted");
    } catch {
      toast.error("Failed to delete chat");
    } finally {
      setDeleteSessionTarget(null);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    const results = await Promise.allSettled(ids.map((id) => deleteSession(id)));
    const failedCount = results.filter((r) => r.status === "rejected").length;
    if (ids.includes(activeSessionId || "")) await startNewChat();
    if (failedCount > 0) {
      toast.error(`Failed to delete ${failedCount} chat${failedCount > 1 ? "s" : ""}`);
    } else {
      toast.success(`${ids.length} chat${ids.length > 1 ? "s" : ""} deleted`);
    }
  };

  const handleBulkArchive = async (ids: string[]) => {
    for (const id of ids) await updateSession(id, { status: "archived" });
    toast.success(`${ids.length} chat${ids.length > 1 ? "s" : ""} archived`);
  };

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
                {m.imageUrl && (
                  <div className={`mb-1.5 ${m.role === "user" ? "flex justify-end" : ""}`}>
                    <img src={m.imageUrl} alt="Uploaded" className="rounded-xl max-w-[200px] max-h-[200px] object-cover border border-border" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-md"
                    : "bg-card border border-border rounded-tl-md text-foreground"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5">
                      <ReactMarkdown>{cleanContent(m.content)}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}

        {messages.length <= 1 && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-2 pt-2">
            {quickActions.map((a) => (
              <button key={a.label} onClick={() => handleSend(a.label)}
                className="bg-card border border-border rounded-full px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 active:scale-95">
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Pending image preview */}
      <AnimatePresence>
        {pendingImage && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-[7.5rem] left-0 right-0 px-4 z-20">
            <div className="max-w-lg mx-auto bg-card border border-border rounded-xl p-2 flex items-center gap-3">
              <img src={pendingImage} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Image attached</p>
                <p className="text-[11px] text-muted-foreground">Add a message or send to analyze</p>
              </div>
              <button onClick={() => setPendingImage(null)} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center active:scale-95">
                <X className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 p-3 bg-card/90 backdrop-blur-xl border-t border-border z-20">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <div className="relative">
            <button onClick={() => setShowAttachMenu(!showAttachMenu)} disabled={isLoading}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all active:scale-95">
              <ImageIcon className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-12 left-0 bg-card border border-border rounded-xl shadow-soft overflow-hidden z-30">
                  <button onClick={() => { cameraInputRef.current?.click(); setShowAttachMenu(false); }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors w-full">
                    <Camera className="w-4 h-4 text-primary" /><span>Camera</span>
                  </button>
                  <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors w-full">
                    <ImageIcon className="w-4 h-4 text-accent" /><span>Gallery</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

          <div className="flex-1">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={pendingImage ? "Add a message (optional)..." : "Ask Cortex anything..."}
              disabled={isLoading}
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50" />
          </div>
          <button onClick={() => handleSend()} disabled={(!input.trim() && !pendingImage) || isLoading}
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 transition-opacity glow-primary active:scale-95">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showAttachMenu && <div className="fixed inset-0 z-10" onClick={() => setShowAttachMenu(false)} />}

      <ChatHistoryPanel
        open={showHistory} onClose={() => setShowHistory(false)} sessions={sessions}
        activeSessionId={activeSessionId} onSelectSession={loadSession} onNewChat={startNewChat}
        onDeleteSession={(id) => setDeleteSessionTarget(id)}
        onArchiveSession={(id) => updateSession(id, { status: "archived" })}
        onBulkDelete={handleBulkDelete} onBulkArchive={handleBulkArchive}
      />

      <DeleteConfirmDialog
        open={!!deleteSessionTarget} title="Delete Chat"
        message="Are you sure you want to delete this chat session? All messages will be lost."
        onConfirm={handleDeleteSessionConfirm} onCancel={() => setDeleteSessionTarget(null)}
      />
    </div>
  );
};

export default ChatPage;
