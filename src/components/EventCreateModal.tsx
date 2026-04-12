import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

interface EventCreateModalProps {
  open: boolean;
  initialDate?: string;
  title?: string;
  onClose: () => void;
}

interface EventFormState {
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  priority: "high" | "medium" | "low";
}

const defaultDate = new Date().toISOString().split("T")[0];

const EventCreateModal = ({ open, onClose, initialDate = defaultDate, title = "Create Event" }: EventCreateModalProps) => {
  const { createEvent } = useCalendarEvents();
  const [form, setForm] = useState<EventFormState>({
    title: "",
    eventDate: initialDate,
    startTime: "",
    endTime: "",
    location: "",
    priority: "medium",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormState, string>>>({});

  useEffect(() => {
    setForm((prev) => ({ ...prev, eventDate: initialDate }));
  }, [initialDate]);

  const requiredComplete = useMemo(
    () => !!form.title.trim() && !!form.eventDate.trim() && !!form.startTime.trim(),
    [form.eventDate, form.startTime, form.title],
  );

  const resetForm = () => {
    setForm({
      title: "",
      eventDate: initialDate,
      startTime: "",
      endTime: "",
      location: "",
      priority: "medium",
    });
    setErrors({});
    setSaving(false);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof EventFormState, string>> = {};
    if (!form.title.trim()) nextErrors.title = "Title is required.";
    if (!form.eventDate.trim()) nextErrors.eventDate = "Date is required.";
    if (!form.startTime.trim()) nextErrors.startTime = "Start time is required.";
    if (form.endTime && form.endTime <= form.startTime) nextErrors.endTime = "End time must be after start time.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await createEvent({
        title: form.title.trim(),
        description: null,
        event_date: form.eventDate,
        start_time: form.startTime,
        end_time: form.endTime || null,
        location: form.location.trim() || null,
        priority: form.priority,
      });
      toast.success("Event created successfully");
      handleCancel();
    } catch {
      // handled in hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-x-0 top-0 bottom-16 bg-foreground/30 backdrop-blur-sm z-[60] flex items-end justify-center"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-full overflow-y-auto bg-card rounded-t-2xl border-t border-border p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
              <button onClick={handleCancel} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-1">
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Event title *"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {errors.title && <p className="text-xs text-destructive px-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.eventDate && <p className="text-xs text-destructive px-1">{errors.eventDate}</p>}
              </div>
              <div className="space-y-1">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.startTime && <p className="text-xs text-destructive px-1">{errors.startTime}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                placeholder="End time (optional)"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {errors.endTime && <p className="text-xs text-destructive px-1">{errors.endTime}</p>}
            </div>

            <input
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="Location (optional)"
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all active:scale-95 ${
                    form.priority === p
                      ? p === "high" ? "bg-destructive text-destructive-foreground" : p === "medium" ? "bg-warning text-primary-foreground" : "bg-success text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={handleCancel} disabled={saving} className="py-3 rounded-xl bg-secondary text-foreground font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-60">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!requiredComplete || saving}
                className="py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EventCreateModal;
