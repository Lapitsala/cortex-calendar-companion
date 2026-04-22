import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { Clock, MapPin, Bell, Layers } from "lucide-react";
import { eventsOverlap } from "@/lib/eventConflicts";
import WeatherBadge from "@/components/WeatherBadge";

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

const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };

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

/** Group events that overlap each other into clusters (stacks). */
const buildStacks = (events: CalendarEvent[]): CalendarEvent[][] => {
  const sorted = [...events].sort(
    (a, b) => parseTimeToHours(a.start_time) - parseTimeToHours(b.start_time),
  );
  const stacks: CalendarEvent[][] = [];
  for (const ev of sorted) {
    const stack = stacks.find((s) => s.some((other) => eventsOverlap(ev, other)));
    if (stack) stack.push(ev);
    else stacks.push([ev]);
  }
  // Sort each stack by priority desc so highest sits on top
  stacks.forEach((s) =>
    s.sort((a, b) => (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0)),
  );
  return stacks;
};

const DayView = ({ selectedDate, events, onEventTap }: DayViewProps) => {
  const dayEvents = events.filter((e) => e.event_date === selectedDate);
  const dateObj = new Date(selectedDate + "T00:00:00");
  const formatted = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const stacks = buildStacks(dayEvents);

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">{formatted}</h3>
      <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
        {/* Hour grid lines */}
        {hours.map((hour) => {
          const top = (hour - START_HOUR) * HOUR_HEIGHT;
          const hourStr =
            hour <= 12
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

        {/* Events overlay (rendered as stacks) */}
        <div className="absolute left-[4.25rem] right-0 top-0 bottom-0">
          {stacks.map((stack, stackIdx) => {
            const earliestStart = Math.min(...stack.map((e) => parseTimeToHours(e.start_time)));
            const latestEnd = Math.max(
              ...stack.map((e) =>
                e.end_time ? parseTimeToHours(e.end_time) : parseTimeToHours(e.start_time) + 1,
              ),
            );
            const containerTop = (earliestStart - START_HOUR) * HOUR_HEIGHT;
            const containerHeight = Math.max((latestEnd - earliestStart) * HOUR_HEIGHT, 28);
            const overlapCount = stack.length;
            const STACK_OFFSET = 4; // px per stacked card

            return (
              <div
                key={stackIdx}
                className="absolute left-1 right-1"
                style={{ top: containerTop, height: containerHeight, minHeight: 28 }}
              >
                {stack.map((event, idx) => {
                  const reminder = isReminder(event);
                  const startH = parseTimeToHours(event.start_time);
                  const endH = event.end_time ? parseTimeToHours(event.end_time) : startH + 1;
                  const evTop = (startH - earliestStart) * HOUR_HEIGHT + idx * STACK_OFFSET;
                  const evHeight = Math.max(
                    (endH - startH) * HOUR_HEIGHT - idx * STACK_OFFSET,
                    24,
                  );
                  const z = 10 + (overlapCount - idx);
                  const showBadge = idx === 0 && overlapCount > 1;

                  return (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventTap(event);
                      }}
                      className={`absolute rounded-lg px-2.5 py-1.5 text-left overflow-hidden active:scale-[0.98] transition-transform border-l-[3px] flex flex-col justify-start ${
                        reminder
                          ? "bg-primary/10 border-l-primary border border-dashed border-primary/30"
                          : `bg-card border border-border shadow-soft ${priorityBorders[event.priority]}`
                      }`}
                      style={{
                        top: evTop,
                        height: evHeight,
                        left: idx * STACK_OFFSET,
                        right: idx * STACK_OFFSET,
                        zIndex: z,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        {event.stack_order ? (
                          <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                            {event.stack_order}
                          </span>
                        ) : reminder ? (
                          <Bell className="w-3 h-3 text-primary flex-shrink-0" />
                        ) : (
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[event.priority]}`}
                          />
                        )}
                        <span
                          className={`text-xs font-semibold truncate ${
                            reminder ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {reminder ? event.title.replace("⏰ ", "") : event.title}
                        </span>
                        {reminder && (
                          <span className="text-[8px] font-medium text-primary bg-primary/10 px-1 py-0.5 rounded flex-shrink-0">
                            Reminder
                          </span>
                        )}
                        {showBadge && (
                          <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded-full flex-shrink-0">
                            <Layers className="w-2.5 h-2.5" />+{overlapCount - 1}
                          </span>
                        )}
                      </div>
                      {evHeight >= 44 && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {event.start_time}
                            {event.end_time ? ` – ${event.end_time}` : ""}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-0.5 truncate">
                              <MapPin className="w-2.5 h-2.5" />
                              {event.location}
                            </span>
                          )}
                          <WeatherBadge
                            location={event.location}
                            date={event.event_date}
                            startTime={event.start_time}
                            className="text-[10px]"
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DayView;
