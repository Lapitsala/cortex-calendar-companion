import { CalendarEvent } from "@/hooks/useCalendarEvents";

interface YearViewProps {
  year: number;
  onSelectMonth: (month: number) => void;
  events: CalendarEvent[];
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const YearView = ({ year, onSelectMonth, events }: YearViewProps) => {
  const today = new Date();

  return (
    <div className="grid grid-cols-3 gap-3">
      {monthNames.map((name, month) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const monthEvents = events.filter(e => {
          const d = new Date(e.event_date);
          return d.getFullYear() === year && d.getMonth() === month;
        });

        return (
          <button
            key={month}
            onClick={() => onSelectMonth(month)}
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              isCurrentMonth ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <p className={`text-xs font-semibold mb-1 ${isCurrentMonth ? "text-primary" : "text-foreground"}`}>{name}</p>
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="w-3 h-3" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasEvent = monthEvents.some(e => e.event_date === dateStr);
                const isToday = isCurrentMonth && day === today.getDate();
                return (
                  <div
                    key={day}
                    className={`w-3 h-3 rounded-full flex items-center justify-center text-[5px] ${
                      isToday ? "bg-primary text-primary-foreground font-bold" : hasEvent ? "bg-primary/20 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            {monthEvents.length > 0 && (
              <p className="text-[9px] text-muted-foreground mt-1">{monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""}</p>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default YearView;
