import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Plus, Archive, CheckSquare, Square, CheckCheck } from "lucide-react";
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
  onBulkDelete?: (ids: string[]) => void;
  onBulkArchive?: (ids: string[]) => void;
}

const ChatHistoryPanel = ({
  open, onClose, sessions, activeSessionId,
  onSelectSession, onNewChat, onDeleteSession, onArchiveSession,
  onBulkDelete, onBulkArchive,
}: ChatHistoryPanelProps) => {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const statusIcon = (status: string) => {
    if (status === "completed") return "✅";
    if (status === "archived") return "📦";
    return "💬";
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map(s => s.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    const ids = Array.from(selected);
    if (onBulkDelete) {
      onBulkDelete(ids);
    } else {
      ids.forEach(id => onDeleteSession(id));
    }
    exitSelectMode();
  };

  const handleBulkArchive = () => {
    const ids = Array.from(selected);
    if (onBulkArchive) {
      onBulkArchive(ids);
    } else {
      ids.forEach(id => onArchiveSession(id));
    }
    exitSelectMode();
  };

  const handleClose = () => {
    exitSelectMode();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
          onClick={handleClose}
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
              <h2 className="font-display text-base font-bold text-foreground">
                {selectMode ? `${selected.size} selected` : "Chat History"}
              </h2>
              <div className="flex items-center gap-1">
                {sessions.length > 0 && (
                  <button
                    onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                    className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95"
                  >
                    <CheckSquare className={`w-4 h-4 ${selectMode ? "text-primary" : "text-muted-foreground"}`} />
                  </button>
                )}
                <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Bulk actions bar */}
            {selectMode && selected.size > 0 && (
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-foreground active:scale-95"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {selected.size === sessions.length ? "Deselect All" : "Select All"}
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleBulkArchive}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 h-8 rounded-lg bg-destructive/10 flex items-center justify-center gap-1 text-destructive text-xs font-medium active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </button>
              </div>
            )}

            {!selectMode && (
              <button
                onClick={onNewChat}
                className="mx-4 mt-3 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" /> New Chat
              </button>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sessions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No chat history yet</p>
              )}
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`rounded-xl border p-3 transition-all ${
                    selectMode && selected.has(session.id)
                      ? "border-primary bg-primary/5"
                      : session.id === activeSessionId && !selectMode
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <button
                    onClick={() => selectMode ? toggleSelect(session.id) : onSelectSession(session.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-2">
                      {selectMode ? (
                        <span className="mt-0.5">
                          {selected.has(session.id) ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </span>
                      ) : (
                        <span className="text-sm">{statusIcon(session.status)}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(session.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </button>
                  {!selectMode && (
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
                  )}
                </div>
              ))}
            </div>

            {/* Bulk delete confirmation */}
            <AnimatePresence>
              {showBulkDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-6 z-10"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-card rounded-2xl border border-border p-5 w-full max-w-xs space-y-3"
                  >
                    <h3 className="font-display text-base font-bold text-foreground">Are you sure you want to delete {selected.size} chat{selected.size > 1 ? "s" : ""}?</h3>
                    <p className="text-sm text-muted-foreground">This action cannot be undone. All messages will be permanently deleted.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowBulkDeleteConfirm(false)}
                        className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmBulkDelete}
                        className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm active:scale-[0.98]"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatHistoryPanel;
