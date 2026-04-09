import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, MapPin, Calendar, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { ShareLevel } from "@/hooks/useCalendarShares";
import MonthView from "@/components/calendar/MonthView";

interface SharedCalendarViewProps {
  ownerUserId: string;
  ownerName: string;
  shareLevel: ShareLevel;
  onBack: () => void;
}

const SharedCalendarView = ({ ownerUserId, ownerName, shareLevel, onBack }: SharedCalendarViewProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => {
    const fetchSharedEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", ownerUserId)
        .order("event_date", { ascending: true });

      if (!error && data) {
        setEvents(data as CalendarEvent[]);
      }
      setLoading(false);
    };
    fetchSharedEvents();
  }, [ownerUserId]);

  const selectedEvents = events.filter(e => e.event_date === selectedDate);

  const levelIcon = shareLevel === "availability_only" ? EyeOff : Eye;
  const LevelIcon = levelIcon;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-background flex flex-col pb-20"
    >
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base font-bold text-foreground truncate">{ownerName}'s Calendar</h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <LevelIcon className="w-3 h-3" />
              <span>{shareLevel === "full" ? "Full access" : shareLevel === "limited" ? "Limited details" : "Availability only"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
                  className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground active:scale-95"
                >
                  ‹
                </button>
                <span className="text-sm font-semibold text-foreground">
                  {new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <button
                  onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
                  className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground active:scale-95"
                >
                  ›
                </button>
              </div>
              <MonthView year={year} month={month} selectedDate={selectedDate} onSelectDate={setSelectedDate} events={events} />
            </div>

            {/* Events list */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </h2>
              <span className="text-xs text-muted-foreground">{selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}</span>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No events for this day
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(event => (
                  <div
                    key={event.id}
                    className="bg-card border border-border rounded-xl p-3.5 shadow-soft"
                  >
                    {shareLevel === "availability_only" ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-warning" />
                        <span className="text-sm font-medium text-foreground">Busy</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-2 h-2 rounded-full ${event.priority === "high" ? "bg-destructive" : event.priority === "medium" ? "bg-warning" : "bg-success"}`} />
                          <h4 className="text-sm font-semibold text-foreground">{event.title}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</span>
                          {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
                        </div>
                        {shareLevel === "full" && event.description && (
                          <p className="text-xs text-muted-foreground mt-2">{event.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {events.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No events found in {ownerName}'s calendar</p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default SharedCalendarView;
