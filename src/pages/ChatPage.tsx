import { useState, useRef, useEffect } from "react";
import { Send, Camera, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessage, { Message } from "@/components/ChatMessage";
import TypingIndicator from "@/components/TypingIndicator";

const sampleReplies: Record<string, { content: string; eventCard?: Message["eventCard"] }> = {
  default: { content: "I can help you manage your calendar! Try saying things like 'Schedule a meeting tomorrow at 3 PM' or 'What do I have next week?'" },
  schedule: {
    content: "I've prepared this event for you. Please confirm or edit:",
    eventCard: { title: "Team Meeting", time: "Tomorrow, 3:00 PM – 4:00 PM", location: "Zoom", priority: "high" },
  },
  week: { content: "Here's your upcoming week:\n\n📅 **Monday** — Design Review (10 AM)\n📅 **Tuesday** — Sprint Planning (2 PM)\n📅 **Wednesday** — Free day ✨\n📅 **Thursday** — Client Call (11 AM)\n📅 **Friday** — Team Retro (4 PM)" },
  goal: { content: "Great goal! I've broken it down into a study plan:\n\n📖 **Week 1-2:** Review core concepts (2h/day)\n📖 **Week 3:** Practice problems (3h/day)\n📖 **Week 4:** Mock exams & revision\n\nShall I schedule these study sessions into your calendar?" },
};

const quickActions = [
  { label: "Schedule meeting", icon: "📅" },
  { label: "What's next week?", icon: "🗓️" },
  { label: "Plan a goal", icon: "🎯" },
];

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hey! I'm **Cortex**, your AI calendar assistant. How can I help you today? ✨" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const getReply = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("schedule") || lower.includes("meeting")) return sampleReplies.schedule;
    if (lower.includes("week") || lower.includes("next")) return sampleReplies.week;
    if (lower.includes("goal") || lower.includes("exam") || lower.includes("prepare")) return sampleReplies.goal;
    return sampleReplies.default;
  };

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const reply = getReply(msg);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply.content,
        eventCard: reply.eventCard,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="glass-strong px-4 py-3 flex items-center gap-3 z-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
          <Sparkles className="w-4.5 h-4.5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold text-foreground">Cortex</h1>
          <p className="text-[11px] text-muted-foreground">AI Calendar Assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-40">
        <AnimatePresence>
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
        </AnimatePresence>
        {isTyping && <TypingIndicator />}

        {/* Quick actions shown only at start */}
        {messages.length === 1 && !isTyping && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-2 pt-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => handleSend(a.label)}
                className="glass rounded-full px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
              >
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 p-3 glass-strong z-20">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <button className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Camera className="w-4.5 h-4.5" />
          </button>
          <div className="flex-1 relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask Cortex anything..."
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 transition-opacity glow-primary"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
