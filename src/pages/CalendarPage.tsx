import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useCalendarEvents, CalendarEvent } from "@/hooks/useCalendarEvents";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import DayView from "@/components/calendar/DayView";
import YearView from "@/components/calendar/YearView";
import EventDetailSheet from "@/components/calendar/EventDetailSheet";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

type ViewMode = "day" | "week" | "month" | "year";

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<{ title: string; time: string; endTime: string; location: string; priority: "high" | "medium" | "low" }>({ title: "", time: "", endTime: "", location: "", priority: "medium" });

  const { events, createEvent, deleteEvent } = useCalendarEvents();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prev = () => {
    if (viewMode === "year") setCurrentDate(new Date(year - 1, 0, 1));
    else if (viewMode === "month") setCurrentDate(new Date(year, month - 1, 1));
    else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split("T")[0]);
    }
  };

  const next = () => {
    if (viewMode === "year") setCurrentDate(new Date(year + 1, 0, 1));
    else if (viewMode === "month") setCurrentDate(new Date(year, month + 1, 1));
    else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d.toISOString().split("T")[0]);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(todayStr);
  };

  const headerTitle = () => {
    if (viewMode === "year") return `${year}`;
    if (viewMode === "month") return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (viewMode === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    return new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error("Event title is required");
      return;
    }
    if (!newEvent.time.trim()) {
      toast.error("Start time is required");
      return;
    }
    // Validate end time > start time if both provided
    if (newEvent.endTime.trim() && newEvent.endTime.trim() <= newEvent.time.trim()) {
      toast.error("End time must be after start time");
      return;
    }
    try {
      await createEvent({
        title: newEvent.title,
        description: null,
        event_date: selectedDate,
        start_time: newEvent.time,
        end_time: newEvent.endTime || null,
        location: newEvent.location || null,
        priority: newEvent.priority,
      });
      setNewEvent({ title: "", time: "", endTime: "", location: "", priority: "medium" });
      setShowAddModal(false);
      toast.success(`"${newEvent.title}" added!`);
    } catch { /* handled in hook */ }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteEvent(deleteTarget);
    setDeleteTarget(null);
    setDetailEvent(null);
    toast.success("Event deleted");
  };

  const handleEventTap = (event: CalendarEvent) => setDetailEvent(event);

  const selectedEvents = events.filter(e => e.event_date === selectedDate);

  const views: ViewMode[] = ["day", "week", "month", "year"];

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-lg font-bold text-foreground">{headerTitle()}</h1>
          <div className="flex items-center gap-1">
            <button onClick={goToToday} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors active:scale-95">
              Today
            </button>
            <button onClick={prev} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:bg-secondary/80 transition-colors active:scale-95">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={next} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:bg-secondary/80 transition-colors active:scale-95">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {views.map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all active:scale-95 ${
                viewMode === v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {viewMode === "month" && (
          <>
            <div className="bg-card border border-border rounded-xl p-3 mb-4">
              <MonthView year={year} month={month} selectedDate={selectedDate} onSelectDate={setSelectedDate} events={events} />
            </div>
            {/* Events list for selected day */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </h2>
              <span className="text-xs text-muted-foreground">{selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}</span>
            </div>
            <AnimatePresence mode="popLayout">
              {selectedEvents.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 text-muted-foreground text-sm">
                  No events for this day
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(event => (
                    <motion.button
                      key={event.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      onClick={() => handleEventTap(event)}
                      className="w-full text-left bg-card border border-border rounded-xl p-3.5 shadow-soft active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-2 h-2 rounded-full ${event.priority === "high" ? "bg-destructive" : event.priority === "medium" ? "bg-warning" : "bg-success"}`} />
                            <h4 className="text-sm font-semibold text-foreground truncate">{event.title}</h4>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.start_time}</span>
                            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </>
        )}

        {viewMode === "week" && (
          <WeekView currentDate={currentDate} selectedDate={selectedDate} onSelectDate={setSelectedDate} events={events} onEventTap={handleEventTap} />
        )}

        {viewMode === "day" && (
          <DayView selectedDate={selectedDate} events={events} onEventTap={handleEventTap} />
        )}

        {viewMode === "year" && (
          <YearView
            year={year}
            events={events}
            onSelectMonth={(m) => {
              setCurrentDate(new Date(year, m, 1));
              setViewMode("month");
            }}
          />
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-soft glow-primary z-20 active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-foreground">New Event</h3>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="Event title" className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="flex gap-2">
                <input value={newEvent.time} onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))} placeholder="Start (e.g. 3:00 PM)" className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input value={newEvent.endTime} onChange={e => setNewEvent(p => ({ ...p, endTime: e.target.value }))} placeholder="End (optional)" className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <input value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} placeholder="Location (optional)" className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewEvent(prev => ({ ...prev, priority: p }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all active:scale-95 ${
                      newEvent.priority === p
                        ? p === "high" ? "bg-destructive text-destructive-foreground" : p === "medium" ? "bg-warning text-primary-foreground" : "bg-success text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button onClick={handleAddEvent} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-[0.98] transition-transform">
                Add Event
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Detail Sheet */}
      <EventDetailSheet
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onDelete={(id) => setDeleteTarget(id)}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default CalendarPage;
