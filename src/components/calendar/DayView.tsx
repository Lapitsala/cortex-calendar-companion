import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { Clock, MapPin, Bell } from "lucide-react";

const priorityColors: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

const isReminder = (event: CalendarEvent) => event.title.startsWith("⏰");

interface DayViewProps {
  selectedDate: string;
  events: CalendarEvent[];
  onEventTap: (event: CalendarEvent) => void;
}

const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

const DayView = ({ selectedDate, events, onEventTap }: DayViewProps) => {
  const dayEvents = events.filter(e => e.event_date === selectedDate);
  const dateObj = new Date(selectedDate + "T00:00:00");
  const formatted = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">{formatted}</h3>
      <div className="space-y-0">
        {hours.map(hour => {
          const hourStr = hour <= 12 ? `${hour === 0 ? 12 : hour}:00 ${hour < 12 ? "AM" : "PM"}` : `${hour - 12}:00 PM`;
          const hourEvents = dayEvents.filter(e => {
            const h = parseInt(e.start_time);
            const isPM = e.start_time.toLowerCase().includes("pm");
            const eventHour = isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);
            return eventHour === hour;
          });
          return (
            <div key={hour} className="flex gap-3 min-h-[3rem] border-t border-border/50">
              <span className="text-[10px] text-muted-foreground w-14 pt-1 text-right flex-shrink-0">{hourStr}</span>
              <div className="flex-1 py-1 space-y-1">
                {hourEvents.map(event => {
                  const reminder = isReminder(event);
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventTap(event)}
                      className={`w-full text-left rounded-lg p-2.5 active:scale-[0.98] transition-transform ${
                        reminder
                          ? "bg-primary/5 border border-dashed border-primary/30"
                          : "bg-card border border-border shadow-soft"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {reminder ? (
                          <Bell className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${priorityColors[event.priority]}`} />
                        )}
                        <span className={`text-sm font-semibold truncate ${reminder ? "text-primary" : "text-foreground"}`}>
                          {reminder ? event.title.replace("⏰ ", "") : event.title}
                        </span>
                        {reminder && (
                          <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Reminder</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.start_time}</span>
                        {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayView;
