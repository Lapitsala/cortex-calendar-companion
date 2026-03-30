import { motion } from "framer-motion";
import { TrendingUp, Clock, Zap, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const weeklyData = [
  { day: "Mon", hours: 6 },
  { day: "Tue", hours: 8 },
  { day: "Wed", hours: 4 },
  { day: "Thu", hours: 7 },
  { day: "Fri", hours: 5 },
  { day: "Sat", hours: 2 },
  { day: "Sun", hours: 1 },
];

const categoryData = [
  { name: "Meetings", value: 35, color: "hsl(192, 91%, 56%)" },
  { name: "Focus", value: 30, color: "hsl(265, 75%, 65%)" },
  { name: "Exercise", value: 15, color: "hsl(160, 70%, 45%)" },
  { name: "Social", value: 20, color: "hsl(38, 92%, 55%)" },
];

const stats = [
  { label: "Focus Hours", value: "18h", change: "+12%", icon: Zap, color: "text-primary" },
  { label: "Tasks Done", value: "24", change: "+8%", icon: Target, color: "text-accent" },
  { label: "Avg. Day", value: "5.2h", change: "-3%", icon: Clock, color: "text-warning" },
  { label: "Streak", value: "7 days", change: "🔥", icon: TrendingUp, color: "text-success" },
];

const InsightsPage = () => (
  <div className="flex flex-col h-[100dvh] pb-20">
    <div className="glass-strong px-4 py-3 z-10">
      <h1 className="font-display text-lg font-bold text-foreground">Insights</h1>
      <p className="text-xs text-muted-foreground">Your productivity wrapped</p>
    </div>

    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass rounded-xl p-3.5"
          >
            <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
            <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
              <span className="text-[11px] text-success font-medium">{s.change}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Weekly chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Weekly Activity</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Bar dataKey="hours" fill="hsl(192, 91%, 56%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Category breakdown */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Time Breakdown</h3>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={100} height={100}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={28} outerRadius={45} dataKey="value" strokeWidth={0}>
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {categoryData.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-xs text-foreground">{c.name}</span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* AI Suggestion */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-xl p-4 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">AI Suggestion</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          Your most productive hours are <strong>10 AM – 1 PM</strong>. Try scheduling deep work during this window for better focus.
        </p>
      </motion.div>
    </div>
  </div>
);

export default InsightsPage;
