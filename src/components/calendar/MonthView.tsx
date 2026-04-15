import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { WantToDoItem } from "@/hooks/useWantToDo";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const priorityColors: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

const priorityBorderColors: Record<string, string> = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-success",
};

interface MonthViewProps {
  year: number;
  month: number;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  events: CalendarEvent[];
  reminders?: WantToDoItem[];
  onToggleReminder?: (id: string, completed: boolean) => void;
  onEventTap?: (event: CalendarEvent) => void;
}

const MonthView = ({ year, month, selectedDate, onSelectDate, events, reminders = [], onToggleReminder, onEventTap }: MonthViewProps) => {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  // Trim trailing empty rows
  const lastDayIdx = cells.lastIndexOf(cells.filter(Boolean).pop()!);
  const rowsNeeded = Math.ceil((lastDayIdx + 1) / 7);
  const trimmedCells = cells.slice(0, rowsNeeded * 7);

  const getDateStr = (day: number) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const eventsForDay = (day: number) => events.filter(e => e.event_date === getDateStr(day));
  const remindersForDay = (day: number) => reminders.filter(r => r.deadline === getDateStr(day));

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-border">
        {daysOfWeek.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1.5 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {trimmedCells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[90px] border-b border-r border-border bg-muted/20" />;
          
          const dateStr = getDateStr(day);
          const isToday = isCurrentMonth && day === today.getDate();
          const isSelected = dateStr === selectedDate;
          const dayEvents = eventsForDay(day);
          const dayReminders = remindersForDay(day);
          const totalItems = dayEvents.length + dayReminders.length;
          const maxVisible = 3;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`min-h-[90px] border-b border-r border-border p-1 text-left transition-colors flex flex-col ${
                isSelected ? "bg-primary/5" : "hover:bg-secondary/50"
              }`}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                  isToday
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-foreground"
                }`}>
                  {day}
                </span>
              </div>

              {/* Events */}
              <div className="flex flex-col gap-[2px] flex-1 overflow-hidden">
                {dayEvents.slice(0, maxVisible).map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventTap?.(event);
                    }}
                    className={`text-[9px] leading-tight px-1 py-[1px] rounded-sm border-l-2 ${priorityBorderColors[event.priority]} bg-secondary/60 truncate cursor-pointer hover:bg-secondary transition-colors`}
                    title={event.title}
                  >
                    <span className="text-muted-foreground">{event.start_time}</span>{" "}
                    <span className="font-medium text-foreground">{event.title}</span>
                  </div>
                ))}

                {/* Reminders with radio button */}
                {dayReminders.slice(0, Math.max(0, maxVisible - dayEvents.length)).map(reminder => (
                  <div
                    key={reminder.id}
                    className="flex items-center gap-0.5 text-[9px] leading-tight group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleReminder?.(reminder.id, !reminder.is_completed);
                      }}
                      className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                        reminder.is_completed
                          ? "bg-success border-success"
                          : "border-muted-foreground hover:border-primary"
                      }`}
                    >
                      {reminder.is_completed && (
                        <div className="w-1 h-1 bg-white rounded-full" />
                      )}
                    </button>
                    <span className={`truncate ${reminder.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {reminder.title}
                    </span>
                  </div>
                ))}

                {/* Overflow indicator */}
                {totalItems > maxVisible && (
                  <div className="text-[8px] text-muted-foreground font-medium pl-1">
                    +{totalItems - maxVisible} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
