import { CalendarEvent } from "@/hooks/useCalendarEvents";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const priorityColors: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

interface MonthViewProps {
  year: number;
  month: number;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  events: CalendarEvent[];
}

const MonthView = ({ year, month, selectedDate, onSelectDate, events }: MonthViewProps) => {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const getDateStr = (day: number) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const eventsForDay = (day: number) => events.filter(e => e.event_date === getDateStr(day));

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {daysOfWeek.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />;
          const dateStr = getDateStr(day);
          const isToday = isCurrentMonth && day === today.getDate();
          const isSelected = dateStr === selectedDate;
          const dayEvents = eventsForDay(day);
          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
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
  );
};

export default MonthView;
