import { CalendarEvent } from "@/hooks/useCalendarEvents";

const priorityColors: Record<string, string> = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-success",
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

  return (
    <div className="space-y-1">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const dateStr = getDateStr(d);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`flex flex-col items-center py-2 rounded-xl transition-all active:scale-95 ${
                isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/10 text-primary" : "text-foreground"
              }`}
            >
              <span className="text-[10px] font-medium opacity-70">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <span className="text-sm font-bold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
      {/* Events for selected day */}
      {selectedDate && (
        <div className="space-y-1.5 pt-2">
          {events
            .filter(e => e.event_date === selectedDate)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map(event => (
              <button
                key={event.id}
                onClick={() => onEventTap(event)}
                className={`w-full text-left bg-card border border-border rounded-xl p-3 border-l-4 ${priorityColors[event.priority]} active:scale-[0.98] transition-transform`}
              >
                <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</p>
                {event.location && <p className="text-xs text-muted-foreground mt-0.5">{event.location}</p>}
              </button>
            ))}
          {events.filter(e => e.event_date === selectedDate).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No events this day</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WeekView;
