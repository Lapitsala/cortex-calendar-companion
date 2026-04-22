import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, MapPin, MessageSquare, Trash2, Flag, Bell, Pencil } from "lucide-react";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { useNavigate } from "react-router-dom";
import EventEditModal from "@/components/EventEditModal";
import WeatherBadge from "@/components/WeatherBadge";

const isReminder = (event: CalendarEvent) => event.title.startsWith("⏰");
const priorityLabels: Record<string, { label: string; class: string }> = {
  high: { label: "High", class: "bg-destructive/10 text-destructive" },
  medium: { label: "Medium", class: "bg-warning/10 text-warning" },
  low: { label: "Low", class: "bg-success/10 text-success" },
};

interface EventDetailSheetProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const EventDetailSheet = ({ event, onClose, onDelete }: EventDetailSheetProps) => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  if (!event) return null;

  const p = priorityLabels[event.priority];
  const dateObj = new Date(event.event_date + "T00:00:00");
  const dateFormatted = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <AnimatePresence>
        {event && (
          <motion.div
            key="event-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 bottom-16 bg-foreground/20 backdrop-blur-sm z-[60] flex items-end"
            onClick={onClose}
          >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg max-h-full mx-auto overflow-y-auto bg-card rounded-t-2xl border-t border-border p-5 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {isReminder(event) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1">
                    <Bell className="w-3 h-3" /> Reminder
                  </span>
                )}
                <h3 className="font-display text-lg font-bold text-foreground">
                  {isReminder(event) ? event.title.replace("⏰ ", "") : event.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">{dateFormatted}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{event.location}</span>
                  <WeatherBadge
                    location={event.location}
                    date={event.event_date}
                    startTime={event.start_time}
                    showTemp
                    showLabel
                    className="ml-auto text-xs text-muted-foreground"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Flag className="w-4 h-4 text-muted-foreground" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.class}`}>{p.label} Priority</span>
              </div>
              {event.description && (
                <p className="text-sm text-muted-foreground bg-secondary rounded-xl p-3">{event.description}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onClose();
                  navigate(`/chat?event=${encodeURIComponent(event.title)}`);
                }}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <MessageSquare className="w-4 h-4" /> Chat
              </button>
              <button
                onClick={() => setEditing(true)}
                className="py-3 px-4 rounded-xl bg-secondary text-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                aria-label="Edit event"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(event.id)}
                className="py-3 px-4 rounded-xl bg-destructive/10 text-destructive font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                aria-label="Delete event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <EventEditModal
        open={editing}
        event={event}
        onClose={() => setEditing(false)}
        onSaved={onClose}
      />
    </>
  );
};

export default EventDetailSheet;
