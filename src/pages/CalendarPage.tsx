import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import EventCard from "@/components/EventCard";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const sampleEvents = [
  { title: "Design Review", time: "10:00 AM", location: "Room 3B", priority: "high" as const },
  { title: "Lunch with Sarah", time: "12:30 PM", location: "Café Nero", priority: "low" as const },
  { title: "Sprint Planning", time: "2:00 PM", location: "Zoom", priority: "medium" as const },
  { title: "Gym Session", time: "6:00 PM", priority: "low" as const },
];

const CalendarPage = () => {
  const [view, setView] = useState<"day" | "week">("day");
  const today = new Date();
  const currentDay = today.getDate();

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  return (
    <div className="flex flex-col h-[100dvh] pb-20">
      {/* Header */}
      <div className="glass-strong px-4 py-3 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {today.toLocaleDateString("en-US", { weekday: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
            <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5 mb-3">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Week strip */}
        <div className="flex justify-between">
          {weekDates.map((d, i) => {
            const isToday = d.getDate() === currentDay;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{daysOfWeek[i]}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isToday ? "bg-primary text-primary-foreground glow-primary" : "text-foreground"
                }`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Today's Events</h2>
          <span className="text-xs text-muted-foreground">{sampleEvents.length} events</span>
        </div>
        <div className="space-y-3">
          {sampleEvents.map((event, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <EventCard {...event} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-soft glow-primary z-20">
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};

export default CalendarPage;
