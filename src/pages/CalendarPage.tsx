import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  location?: string;
  priority: "high" | "medium" | "low";
  day: number; // day of month
}

const priorityColors: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", time: "", location: "", priority: "medium" as const });
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: "1", title: "Design Review", time: "10:00 AM", location: "Room 3B", priority: "high", day: new Date().getDate() },
    { id: "2", title: "Lunch with Sarah", time: "12:30 PM", location: "Café Nero", priority: "low", day: new Date().getDate() },
    { id: "3", title: "Sprint Planning", time: "2:00 PM", location: "Zoom", priority: "medium", day: new Date().getDate() },
    { id: "4", title: "Gym Session", time: "6:00 PM", priority: "low", day: new Date().getDate() + 1 },
    { id: "5", title: "Client Call", time: "11:00 AM", location: "Teams", priority: "high", day: new Date().getDate() + 2 },
  ]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().getDate());
  };

  const eventsForDay = (day: number) => events.filter(e => e.day === day);
  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.time) {
      toast.error("Please fill in title and time");
      return;
    }
    const event: CalendarEvent = {
      id: Date.now().toString(),
      ...newEvent,
      day: selectedDay || today.getDate(),
    };
    setEvents(prev => [...prev, event]);
    setNewEvent({ title: "", time: "", location: "", priority: "medium" });
    setShowAddModal(false);
    toast.success(`"${event.title}" added!`);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    toast.success("Event deleted");
  };

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={goToToday} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
              Today
            </button>
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:bg-secondary/80 transition-colors active:scale-95">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:bg-secondary/80 transition-colors active:scale-95">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {daysOfWeek.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarCells.map((day, i) => {
            if (!day) return <div key={i} className="aspect-square" />;
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = day === selectedDay;
            const dayEvents = eventsForDay(day);
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all active:scale-95 relative ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : isToday
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                {day}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((e, j) => (
                      <div key={j} className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground/70" : priorityColors[e.priority]}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {selectedDay ? `${currentDate.toLocaleDateString("en-US", { month: "short" })} ${selectedDay}` : "Select a day"}
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
              {selectedEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-card border border-border rounded-xl p-3.5 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-2 h-2 rounded-full ${priorityColors[event.priority]}`} />
                        <h4 className="text-sm font-semibold text-foreground truncate">{event.title}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}</span>
                        {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors active:scale-95"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
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

              <input
                value={newEvent.title}
                onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                placeholder="Event title"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                value={newEvent.time}
                onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                placeholder="Time (e.g. 3:00 PM)"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                value={newEvent.location}
                onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                placeholder="Location (optional)"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />

              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewEvent(prev => ({ ...prev, priority: p }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all active:scale-95 ${
                      newEvent.priority === p
                        ? `${priorityColors[p]} text-primary-foreground`
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={handleAddEvent}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-[0.98] transition-transform"
              >
                Add Event
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarPage;
