import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Trash2, Plus, Archive } from "lucide-react";
import { ChatSession } from "@/hooks/useChatSessions";

interface ChatHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onArchiveSession: (id: string) => void;
}

const ChatHistoryPanel = ({
  open, onClose, sessions, activeSessionId,
  onSelectSession, onNewChat, onDeleteSession, onArchiveSession,
}: ChatHistoryPanelProps) => {
  const statusIcon = (status: string) => {
    if (status === "completed") return "✅";
    if (status === "archived") return "📦";
    return "💬";
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25 }}
            onClick={e => e.stopPropagation()}
            className="w-[85%] max-w-sm h-full bg-card border-r border-border flex flex-col"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-foreground">Chat History</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <button
              onClick={onNewChat}
              className="mx-4 mt-3 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" /> New Chat
            </button>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sessions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No chat history yet</p>
              )}
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`rounded-xl border p-3 transition-all ${
                    session.id === activeSessionId
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <button
                    onClick={() => onSelectSession(session.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{statusIcon(session.status)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(session.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="flex gap-1 mt-2 justify-end">
                    {session.status !== "archived" && (
                      <button
                        onClick={() => onArchiveSession(session.id)}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteSession(session.id)}
                      className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatHistoryPanel;
