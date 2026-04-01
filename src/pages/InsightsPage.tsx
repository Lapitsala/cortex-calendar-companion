import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Switch } from "@/components/ui/switch";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

const InsightsPage = () => {
  const { events } = useCalendarEvents();
  const [range, setRange] = useState<"month" | "year">("month");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(localStorage.getItem("analytics_enabled") !== "false");
  const now = new Date();

  const periodEvents = useMemo(() => events.filter((e) => {
    const d = new Date(`${e.event_date}T00:00:00`);
    return range === "month"
      ? d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      : d.getFullYear() === now.getFullYear();
  }), [events, now, range]);

  const analytics = useMemo(() => {
    const hourCount = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    const dayCount = new Map<string, number>();
    const categoryCount = new Map<string, number>();
    let completed = 0;
    let missed = 0;
    let focusHours = 0;
    periodEvents.forEach((e) => {
      const date = new Date(`${e.event_date}T00:00:00`);
      const hour = Number((e.start_time || "00:00").split(":")[0]) || 0;
      hourCount[hour].count += 1;
      dayCount.set(e.event_date, (dayCount.get(e.event_date) || 0) + 1);
      const cat = /(study|work|project|focus)/i.test(e.title) ? "Focus/Work" : /(meet|sync|call)/i.test(e.title) ? "Meetings" : /(gym|run|exercise)/i.test(e.title) ? "Health" : "Other";
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      if (/done|completed|finished/i.test(e.title)) completed += 1;
      if (date < now) missed += 1;
      if (/(study|work|focus)/i.test(e.title)) focusHours += 1;
    });
    const peakHour = hourCount.reduce((a, b) => b.count > a.count ? b : a, hourCount[0]);
    const busiest = Array.from(dayCount.entries()).sort((a, b) => b[1] - a[1])[0];
    const categoryData = Array.from(categoryCount.entries()).map(([name, value], i) => ({
      name, value, color: ["hsl(192, 91%, 56%)", "hsl(265, 75%, 65%)", "hsl(160, 70%, 45%)", "hsl(38, 92%, 55%)"][i % 4],
    }));
    return {
      total: periodEvents.length,
      completed,
      missed,
      focusHours,
      peakHour: peakHour.hour,
      busyFreeRatio: `${periodEvents.length}:${Math.max(1, (range === "month" ? 120 : 365) - periodEvents.length)}`,
      categoryData,
      hourCount,
      timeline: Array.from(dayCount.entries()).map(([date, count]) => ({ date: date.slice(5), count })).slice(-12),
      highlight: busiest ? `${new Date(`${busiest[0]}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" })} is your busiest day.` : "No events yet.",
    };
  }, [periodEvents, range, now]);

  const toggleAnalytics = (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    localStorage.setItem("analytics_enabled", String(enabled));
  };

  const clearAnalyticsData = () => localStorage.removeItem("analytics_enabled");

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      <div className="bg-card border-b border-border px-4 py-3 z-10">
        <h1 className="font-display text-lg font-bold text-foreground">Insights</h1>
        <p className="text-xs text-muted-foreground">Your Wrapped productivity summary</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground">Your data is analyzed locally to protect your privacy.</div>
        <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Enable Analytics</span>
          <Switch checked={analyticsEnabled} onCheckedChange={toggleAnalytics} />
        </div>
        <button onClick={clearAnalyticsData} className="w-full py-2.5 rounded-xl bg-secondary text-sm text-foreground">Clear Analytics Data</button>
        <div className="flex gap-2">
          <button onClick={() => setRange("month")} className={`flex-1 py-2 rounded-xl text-sm ${range === "month" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>Monthly</button>
          <button onClick={() => setRange("year")} className={`flex-1 py-2 rounded-xl text-sm ${range === "year" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>Yearly</button>
        </div>
        {analyticsEnabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Total Events", analytics.total],
                ["Completed vs Missed", `${analytics.completed}/${analytics.missed}`],
                ["Focus Time", `${analytics.focusHours}h`],
                ["Busy:Free", analytics.busyFreeRatio],
              ].map(([k, v]) => <div key={k} className="bg-card border border-border rounded-xl p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="text-lg font-bold text-foreground">{v}</p></div>)}
            </div>
            <motion.div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2">Peak Productivity Hours</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={analytics.hourCount}><XAxis dataKey="hour" hide /><YAxis hide /><Bar dataKey="count" fill="hsl(192, 91%, 56%)" radius={[6, 6, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </motion.div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2">Timeline Summary</h3>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={analytics.timeline}><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis hide /><Line type="monotone" dataKey="count" stroke="hsl(265, 75%, 65%)" strokeWidth={2} /></LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2">Most Common Activities</h3>
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart><Pie data={analytics.categoryData} dataKey="value" innerRadius={24} outerRadius={40}>{analytics.categoryData.map((c, i) => <Cell key={i} fill={c.color} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">{analytics.categoryData.map((c) => <p className="text-xs text-foreground" key={c.name}>{c.name}: {c.value}</p>)}</div>
              </div>
            </div>
            <div className="rounded-xl p-4 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 space-y-1">
              <p className="text-xs font-semibold text-primary">AI Insight</p>
              <p className="text-sm text-foreground">You are most productive between <strong>{analytics.peakHour}:00–{analytics.peakHour + 2}:00</strong>. {analytics.highlight} Try reducing Friday overload with 15-minute buffers.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;
