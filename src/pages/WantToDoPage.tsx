import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Calendar as CalIcon, MessageSquare, CheckCircle2, Circle, Clock, AlertTriangle, ExternalLink, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useWantToDo, WantToDoItem } from "@/hooks/useWantToDo";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useEventConflictCheck } from "@/hooks/useEventConflictCheck";
import ConflictResolverDialog from "@/components/ConflictResolverDialog";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

type Filter = "all" | "active" | "completed";

const priorityColors = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

const WantToDoPage = () => {
  const { items, loading, create, update, remove } = useWantToDo();
  const { attemptCreateEvent, conflictDialogProps } = useEventConflictCheck();
  const { createSession, addMessage } = useChatSessions();
  const navigate = useNavigate();

  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editDeadlineTime, setEditDeadlineTime] = useState("09:00");
  const [editPriority, setEditPriority] = useState<"high" | "medium" | "low">("medium");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("09:00");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  const filtered = items.filter(i => {
    if (filter === "active") return !i.is_completed;
    if (filter === "completed") return i.is_completed;
    return true;
  });

  const resetAddForm = () => {
    setTitle("");
    setDescription("");
    setDeadline("");
    setDeadlineTime("09:00");
    setPriority("medium");
  };

  const closeAddSheet = () => {
    resetAddForm();
    setShowAdd(false);
  };

  const handleAdd = async () => {
    if (!title.trim()) { toast.error("Please enter a title"); return; }
    const item = await create({ title: title.trim(), description: description.trim() || null, deadline: deadline || null, deadline_time: deadlineTime, priority });
    
    // Auto-sync to calendar if deadline is set
    if (deadline && item) {
      try {
        const eventId = await attemptCreateEvent({
          title: `✅ ${item.title}`,
          description: item.description || "From Want-to-do list",
          event_date: deadline,
          start_time: deadlineTime || "09:00",
          end_time: null,
          location: null,
          priority: item.priority,
        });
        if (eventId) {
          await update(item.id, { synced_event_id: eventId });
          toast.success("Added & synced to Calendar! 📅✨");
        } else {
          toast.success("Added to your Want-to-do list! ✨");
        }
      } catch {
        toast.success("Added to your Want-to-do list! ✨");
      }
    } else {
      toast.success("Added to your Want-to-do list! ✨");
    }

    closeAddSheet();
  };

  const toggleComplete = async (item: WantToDoItem) => {
    await update(item.id, { is_completed: !item.is_completed });
  };

  const syncToCalendar = async (item: WantToDoItem) => {
    if (!item.deadline) { toast.error("Set a deadline first"); return; }
    if (item.synced_event_id) { toast.info("Already synced to calendar"); return; }
    try {
      const eventId = await attemptCreateEvent({
        title: `✅ ${item.title}`,
        description: item.description || "From Want-to-do list",
        event_date: item.deadline,
        start_time: item.deadline_time || "09:00",
        end_time: null,
        location: null,
        priority: item.priority,
      });
      if (eventId) {
        await update(item.id, { synced_event_id: eventId });
        toast.success("Synced to Calendar! 📅");
      }
    } catch { toast.error("Failed to sync"); }
  };

  const askCortex = async (item: WantToDoItem) => {
    try {
      // Create a new dedicated chat session for this task
      const session = await createSession();
      
      // Build the initial message
      const msg = `Help me plan how to complete this task: "${item.title}"${item.deadline ? ` (deadline: ${item.deadline})` : ""}${item.description ? `. Details: ${item.description}` : ""}`;
      
      // Add the user message to the new session
      await addMessage(session.id, "user", msg);
      
      // Link the chat session to this want-to-do item
      await update(item.id, { chat_session_id: session.id });
      
      // Navigate to chat with the specific session
      navigate(`/chat?session=${session.id}`);
    } catch {
      toast.error("Failed to start chat");
    }
  };

  const openLinkedChat = (item: WantToDoItem) => {
    if (item.chat_session_id) {
      navigate(`/chat?session=${item.chat_session_id}`);
    }
  };

  const startEdit = (item: WantToDoItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setEditDeadline(item.deadline || "");
    setEditDeadlineTime(item.deadline_time || "09:00");
    setEditPriority(item.priority);
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) { toast.error("Title is required"); return; }
    const currentItem = items.find(i => i.id === editingId);
    const updates: Partial<WantToDoItem> = {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      deadline: editDeadline || null,
      deadline_time: editDeadlineTime,
      priority: editPriority,
    };

    // Auto-sync to calendar if deadline is set and not yet synced
    if (editDeadline && (!currentItem?.synced_event_id)) {
      try {
        const eventId = await attemptCreateEvent({
          title: `✅ ${editTitle.trim()}`,
          description: editDescription.trim() || "From Want-to-do list",
          event_date: editDeadline,
          start_time: editDeadlineTime || "09:00",
          end_time: null,
          location: null,
          priority: editPriority,
        });
        if (eventId) {
          updates.synced_event_id = eventId;
          toast.success("Updated & synced to Calendar! 📅✨");
        } else {
          toast.success("Updated!");
        }
      } catch {
        toast.success("Updated!");
      }
    } else {
      toast.success("Updated!");
    }

    await update(editingId, updates);
    setEditingId(null);
  };

  const isOverdue = (item: WantToDoItem) => {
    if (!item.deadline || item.is_completed) return false;
    return new Date(item.deadline) < new Date(new Date().toISOString().split("T")[0]);
  };

  const activeCount = items.filter(i => !i.is_completed).length;
  const completedCount = items.filter(i => i.is_completed).length;

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Want to do</h1>
            <p className="text-xs text-muted-foreground">{activeCount} active · {completedCount} done</p>
          </div>
        </div>
        {/* Filter */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {(["all", "active", "completed"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all active:scale-95 ${
                filter === f ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {filter === "all" ? "No items yet. Tap + to add one!" : `No ${filter} items`}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filtered.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={`bg-card border rounded-xl p-3.5 shadow-soft transition-all ${
                    item.is_completed ? "border-border/50 opacity-60" : isOverdue(item) ? "border-destructive/30" : "border-border"
                  }`}
                >
                  {editingId === item.id ? (
                    /* Edit mode */
                    <div className="space-y-2">
                      <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" className="text-sm" />
                      <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Description" className="min-h-[50px] text-xs" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="text-xs" />
                        <Input type="time" value={editDeadlineTime} onChange={e => setEditDeadlineTime(e.target.value)} className="text-xs" />
                      </div>
                      <div className="flex gap-1.5">
                        {(["low", "medium", "high"] as const).map(p => (
                          <button key={p} onClick={() => setEditPriority(p)}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-medium capitalize border transition-all ${editPriority === p ? priorityColors[p] : "border-border text-muted-foreground"}`}
                          >{p}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium flex items-center justify-center gap-1">
                          <X className="w-3 h-3" />Cancel
                        </button>
                        <button onClick={saveEdit} className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1">
                          <Save className="w-3 h-3" />Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggleComplete(item)} className="mt-0.5 shrink-0">
                          {item.is_completed
                            ? <CheckCircle2 className="w-5 h-5 text-success" />
                            : <Circle className="w-5 h-5 text-muted-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-semibold ${item.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {item.title}
                            </span>
                            {isOverdue(item) && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {item.deadline && (
                              <span className={`flex items-center gap-1 ${isOverdue(item) ? "text-destructive" : ""}`}>
                                <Clock className="w-3 h-3" />{item.deadline}
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${priorityColors[item.priority]}`}>
                              {item.priority}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => startEdit(item)} className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-2 ml-8 flex-wrap">
                        {item.deadline && !item.synced_event_id && (
                          <button onClick={() => syncToCalendar(item)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors">
                            <CalIcon className="w-3 h-3" />Sync to Cal
                          </button>
                        )}
                        <button onClick={() => askCortex(item)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-[10px] font-medium hover:bg-accent/80 transition-colors">
                          <MessageSquare className="w-3 h-3" />Ask Cortex
                        </button>
                        {item.chat_session_id && (
                          <button onClick={() => openLinkedChat(item)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground text-[10px] font-medium hover:bg-secondary/80 transition-colors">
                            <ExternalLink className="w-3 h-3" />View Chat
                          </button>
                        )}
                        <button onClick={() => setDeleteId(item.id)} className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-soft glow-primary z-20 active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/30 backdrop-blur-sm"
            onClick={closeAddSheet}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">Add Want to do</h2>
                  <p className="text-xs text-muted-foreground">Create a task and optionally add a calendar reminder.</p>
                </div>
                <button
                  onClick={closeAddSheet}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div>
                  <Label className="text-xs">Title *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you want to do?" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." className="mt-1 min-h-[96px]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Deadline</Label>
                    <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Time</Label>
                    <Input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <div className="mt-1 flex gap-2">
                    {(["low", "medium", "high"] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-all ${
                          priority === p ? priorityColors[p] : "border-border text-muted-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 border-t border-border bg-card px-5 py-4">
                <div className="flex gap-2">
                  <button onClick={closeAddSheet} className="flex-1 rounded-xl bg-secondary py-3 text-sm font-medium text-foreground active:scale-[0.98] transition-transform">
                    Cancel
                  </button>
                  <button onClick={handleAdd} className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground active:scale-[0.98] transition-transform disabled:opacity-50" disabled={!title.trim()}>
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmDialog
        open={!!deleteId}
        onConfirm={async () => { if (deleteId) { await remove(deleteId); setDeleteId(null); toast.success("Deleted"); } }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default WantToDoPage;
