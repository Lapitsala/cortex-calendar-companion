import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Clock, MapPin, X, Trash2, Check } from "lucide-react";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { priorityRank } from "@/lib/eventConflicts";

export interface PendingEvent {
  title: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  priority: "high" | "medium" | "low";
  description?: string | null;
}

export interface ConflictResolution {
  /** Ordered list of event IDs the user chose to keep (1 = highest stack priority). New event uses id "__new__". */
  keepOrder: string[];
  /** IDs of existing events the user chose to delete. */
  toDelete: string[];
  /** Whether the new event should be created at all. */
  createNew: boolean;
}

interface ConflictResolverDialogProps {
  open: boolean;
  newEvent: PendingEvent | null;
  conflictingEvents: CalendarEvent[];
  onCancel: () => void;
  onResolve: (resolution: ConflictResolution) => void;
}

const NEW_ID = "__new__";

const priorityBadge: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-primary-foreground",
  low: "bg-success text-primary-foreground",
};

interface CardItem {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  priority: "high" | "medium" | "low";
  isNew: boolean;
}

const ConflictResolverDialog = ({
  open,
  newEvent,
  conflictingEvents,
  onCancel,
  onResolve,
}: ConflictResolverDialogProps) => {
  const items: CardItem[] = useMemo(() => {
    if (!newEvent) return [];
    const list: CardItem[] = [
      {
        id: NEW_ID,
        title: newEvent.title,
        start_time: newEvent.start_time,
        end_time: newEvent.end_time,
        location: newEvent.location,
        priority: newEvent.priority,
        isNew: true,
      },
      ...conflictingEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start_time: e.start_time,
        end_time: e.end_time,
        location: e.location,
        priority: e.priority,
        isNew: false,
      })),
    ];
    // Default order: highest priority first, then existing order
    list.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
    return list;
  }, [newEvent, conflictingEvents]);

  /** Map of itemId → rank (1-based). undefined means not selected. */
  const [ranks, setRanks] = useState<Record<string, number>>({});
  /** Map of itemId → marked-for-deletion. */
  const [toDelete, setToDelete] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setRanks({});
      setToDelete({});
    }
  }, [open, newEvent?.title]);

  const selectedCount = Object.keys(ranks).length;
  const nextRank = selectedCount + 1;

  const toggleRank = (id: string) => {
    setRanks((prev) => {
      const next = { ...prev };
      if (next[id]) {
        const removed = next[id];
        delete next[id];
        // Re-rank items that were after the removed one
        Object.keys(next).forEach((k) => {
          if (next[k] > removed) next[k] -= 1;
        });
      } else {
        next[id] = Object.keys(next).length + 1;
        // If marked for delete, unmark
        setToDelete((d) => {
          if (!d[id]) return d;
          const nd = { ...d };
          delete nd[id];
          return nd;
        });
      }
      return next;
    });
  };

  const toggleDelete = (id: string) => {
    setToDelete((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else {
        next[id] = true;
        // If ranked, unrank
        setRanks((r) => {
          if (!r[id]) return r;
          const removed = r[id];
          const nr = { ...r };
          delete nr[id];
          Object.keys(nr).forEach((k) => {
            if (nr[k] > removed) nr[k] -= 1;
          });
          return nr;
        });
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const orderedIds = Object.entries(ranks)
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => id);
    const deleteIds = Object.keys(toDelete).filter((id) => id !== NEW_ID);
    const createNew = ranks[NEW_ID] !== undefined;
    onResolve({ keepOrder: orderedIds, toDelete: deleteIds, createNew });
  };

  const canConfirm = selectedCount > 0 || Object.keys(toDelete).length > 0;

  return (
    <AnimatePresence>
      {open && newEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5 text-warning" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">Time conflict detected</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    เลือกลำดับที่ต้องการทำ (1 = สำคัญที่สุด) หรือลบอันที่ไม่ต้องการ
                  </p>
                </div>
              </div>
              <button onClick={onCancel} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const rank = ranks[item.id];
                const isDeleted = toDelete[item.id];
                return (
                  <div
                    key={item.id}
                    className={`relative rounded-xl border p-3 transition-all ${
                      isDeleted
                        ? "border-destructive/40 bg-destructive/5 opacity-60"
                        : rank
                        ? "border-primary bg-primary/5"
                        : "border-border bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Rank circle */}
                      <button
                        onClick={() => toggleRank(item.id)}
                        disabled={isDeleted}
                        className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm transition-all active:scale-95 ${
                          rank
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border-2 border-dashed border-border text-muted-foreground hover:border-primary"
                        } ${isDeleted ? "cursor-not-allowed" : ""}`}
                      >
                        {rank || nextRank}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-sm font-semibold truncate ${isDeleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {item.title}
                          </h4>
                          {item.isNew && (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">NEW</span>
                          )}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${priorityBadge[item.priority]}`}>
                            {item.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.start_time}{item.end_time ? ` – ${item.end_time}` : ""}
                          </span>
                          {item.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete toggle (only for existing events) */}
                      {!item.isNew && (
                        <button
                          onClick={() => toggleDelete(item.id)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
                            isDeleted
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-background border border-border text-muted-foreground hover:text-destructive hover:border-destructive"
                          }`}
                          aria-label="Delete this event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] text-muted-foreground bg-secondary/40 rounded-lg p-2.5 leading-relaxed">
              <strong className="text-foreground">เคล็ดลับ:</strong> กดวงกลมหมายเลขเพื่อจัดลำดับความสำคัญ (1, 2, 3...) — อันที่ไม่ได้เลือกจะคงอยู่ในปฏิทินตามเดิม. กดถังขยะเพื่อลบอีเวนต์เดิม.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onCancel}
                className="py-3 rounded-xl bg-secondary text-foreground font-medium text-sm active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConflictResolverDialog;
