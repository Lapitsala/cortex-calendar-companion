import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, Bell } from "lucide-react";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import WeatherBadge from "@/components/WeatherBadge";

const isReminder = (event: CalendarEvent) => event.title.startsWith("⏰");

const priorityDot: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

interface WeekViewProps {
  currentDate: Date;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  events: CalendarEvent[];
  onEventTap: (event: CalendarEvent) => void;
}

const WeekView = ({ currentDate, selectedDate, onSelectDate, events, onEventTap }: WeekViewProps) => {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const getDateStr = (d: Date) => d.toISOString().split("T")[0];

  // Auto-select today if in this week
  useEffect(() => {
    if (!selectedDate) {
      const todayInWeek = days.find(d => getDateStr(d) === todayStr);
      if (todayInWeek) onSelectDate(todayStr);
      else onSelectDate(getDateStr(days[0]));
    }
  }, [currentDate]);

  const selectedEvents = events
    .filter(e => e.event_date === selectedDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const getEventCountForDay = (dateStr: string) => events.filter(e => e.event_date === dateStr).length;

  return (
    <div className="space-y-3">
      {/* Week strip */}
      <div className="bg-card border border-border rounded-xl p-2">
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => {
            const dateStr = getDateStr(d);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const eventCount = getEventCountForDay(dateStr);
            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`relative flex flex-col items-center py-2.5 rounded-xl transition-all active:scale-95 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : isToday
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <span className="text-[10px] font-medium opacity-70">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="text-lg font-bold">{d.getDate()}</span>
                {/* Event dots */}
                {eventCount > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? "bg-primary-foreground/70" : "bg-primary/60"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-foreground">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </h3>
              <span className="text-xs text-muted-foreground">
                {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
              </span>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">No events this day</p>
                <p className="text-xs text-muted-foreground mt-1">Tap + to add one</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((event, i) => {
                  const reminder = isReminder(event);
                  return (
                    <motion.button
                      key={event.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => onEventTap(event)}
                      className={`w-full text-left rounded-xl p-3.5 active:scale-[0.98] transition-transform ${
                        reminder
                          ? "bg-primary/5 border border-dashed border-primary/30 shadow-none"
                          : "bg-card border border-border shadow-soft"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Time column */}
                        <div className="flex flex-col items-center pt-0.5">
                          {reminder ? (
                            <Bell className="w-4 h-4 text-primary" />
                          ) : (
                            <div className={`w-2.5 h-2.5 rounded-full ${priorityDot[event.priority]}`} />
                          )}
                          <div className="w-px h-full bg-border mt-1" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {reminder && (
                              <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Reminder</span>
                            )}
                            <h4 className={`text-sm font-semibold truncate ${reminder ? "text-primary" : "text-foreground"}`}>
                              {reminder ? event.title.replace("⏰ ", "") : event.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {event.start_time}
                              {event.end_time ? ` – ${event.end_time}` : ""}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </span>
                            )}
                            <WeatherBadge
                              location={event.location}
                              date={event.event_date}
                              startTime={event.start_time}
                              showTemp
                            />
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{event.description}</p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeekView;
