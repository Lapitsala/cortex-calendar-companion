import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { Clock, MapPin, Bell } from "lucide-react";

const priorityColors: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

const priorityBorders: Record<string, string> = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-success",
};

const isReminder = (event: CalendarEvent) => event.title.startsWith("⏰");

interface DayViewProps {
  selectedDate: string;
  events: CalendarEvent[];
  onEventTap: (event: CalendarEvent) => void;
}

const HOUR_HEIGHT = 60; // px per hour
const START_HOUR = 6;
const END_HOUR = 22;
const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

/** Parse time string like "9:00 AM" or "14:00" into fractional hours (e.g. 9.5 for 9:30 AM) */
const parseTimeToHours = (timeStr: string): number => {
  const cleaned = timeStr.trim().toLowerCase();
  const isPM = cleaned.includes("pm");
  const isAM = cleaned.includes("am");
  const numeric = cleaned.replace(/[ap]m/i, "").trim();
  const parts = numeric.split(":");
  let h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;

  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  if (!isPM && !isAM && h < 6) h += 12; // assume PM for ambiguous small numbers

  return h + m / 60;
};

const DayView = ({ selectedDate, events, onEventTap }: DayViewProps) => {
  const dayEvents = events.filter(e => e.event_date === selectedDate);
  const dateObj = new Date(selectedDate + "T00:00:00");
  const formatted = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">{formatted}</h3>
      <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
        {/* Hour grid lines */}
        {hours.map(hour => {
          const top = (hour - START_HOUR) * HOUR_HEIGHT;
          const hourStr = hour <= 12
            ? `${hour === 0 ? 12 : hour}:00 ${hour < 12 ? "AM" : "PM"}`
            : `${hour - 12}:00 PM`;
          return (
            <div key={hour} className="absolute left-0 right-0 flex gap-3" style={{ top }}>
              <span className="text-[10px] text-muted-foreground w-14 -mt-1.5 text-right flex-shrink-0">
                {hourStr}
              </span>
              <div className="flex-1 border-t border-border/40" />
            </div>
          );
        })}

        {/* Events overlay */}
        <div className="absolute left-[4.25rem] right-0 top-0 bottom-0">
          {dayEvents.map(event => {
            const startH = parseTimeToHours(event.start_time);
            const endH = event.end_time ? parseTimeToHours(event.end_time) : startH + 1;
            const top = (startH - START_HOUR) * HOUR_HEIGHT;
            const height = Math.max((endH - startH) * HOUR_HEIGHT, 28);
            const reminder = isReminder(event);

            return (
              <button
                key={event.id}
                onClick={() => onEventTap(event)}
                className={`absolute left-1 right-1 rounded-lg px-2.5 py-1.5 text-left overflow-hidden active:scale-[0.98] transition-transform border-l-[3px] flex flex-col justify-start ${
                  reminder
                    ? "bg-primary/10 border-l-primary border border-dashed border-primary/30"
                    : `bg-card border border-border shadow-soft ${priorityBorders[event.priority]}`
                }`}
                style={{ top, height, minHeight: 28 }}
              >
                <div className="flex items-center gap-1.5">
                  {reminder ? (
                    <Bell className="w-3 h-3 text-primary flex-shrink-0" />
                  ) : (
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[event.priority]}`} />
                  )}
                  <span className={`text-xs font-semibold truncate ${reminder ? "text-primary" : "text-foreground"}`}>
                    {reminder ? event.title.replace("⏰ ", "") : event.title}
                  </span>
                  {reminder && (
                    <span className="text-[8px] font-medium text-primary bg-primary/10 px-1 py-0.5 rounded flex-shrink-0">Reminder</span>
                  )}
                </div>
                {height >= 44 && (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</span>
                    {event.location && <span className="flex items-center gap-0.5 truncate"><MapPin className="w-2.5 h-2.5" />{event.location}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DayView;
