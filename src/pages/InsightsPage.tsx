import { useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Tooltip,
} from "recharts";
import { ArrowLeft, Share2, Download, ChevronDown } from "lucide-react";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { useTranslation } from "@/i18n/LanguageProvider";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
];

const InsightsPage = () => {
  const navigate = useNavigate();
  const { events } = useCalendarEvents();
  const { isPreviewMode } = useAuth();
  const { t } = useTranslation();
  const shareRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [view, setView] = useState<"month" | "year">("month");
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const periodEvents = useMemo(() => events.filter((e) => {
    const d = new Date(`${e.event_date}T00:00:00`);
    return view === "month"
      ? d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
      : d.getFullYear() === selectedYear;
  }), [events, selectedMonth, selectedYear, view]);

  const analytics = useMemo(() => {
    const hourCount = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: 0 }));
    const dayOfWeekCount = [0, 0, 0, 0, 0, 0, 0];
    const categoryCount = new Map<string, number>();
    const subCategoryCount = new Map<string, Map<string, { count: number; samples: Set<string> }>>();
    let totalDuration = 0;

    periodEvents.forEach((e) => {
      const date = new Date(`${e.event_date}T00:00:00`);
      const hour = Number((e.start_time || "00:00").split(":")[0]) || 0;
      hourCount[hour].count += 1;
      dayOfWeekCount[date.getDay()] += 1;

      // Category classification
      const title = e.title.toLowerCase();
      const cat = /(study|learn|class|lecture|homework)/i.test(title) ? "Study"
        : /(work|project|meeting|sync|call)/i.test(title) ? "Work"
        : /(gym|run|exercise|yoga|swim|sport)/i.test(title) ? "Health"
        : /(eat|lunch|dinner|breakfast|coffee|movie|หนัง|เที่ยว|party|hangout|เพื่อน|friend)/i.test(title) ? "Social"
        : "Personal";
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);

      // ----- Sub-category (more specific) -----
      let sub = "general";
      if (cat === "Personal") {
        sub = /(doctor|dentist|clinic|hospital|appointment|หมอ|คลินิก|รพ|โรงพยาบาล|ตรวจ)/i.test(title) ? "appointment"
          : /(bank|atm|pay|bill|errand|ธนาคาร|จ่าย|บิล|ธุระ)/i.test(title) ? "errand"
          : /(family|mom|dad|parent|พ่อ|แม่|ครอบครัว|ญาติ)/i.test(title) ? "family"
          : /(read|book|hobby|art|draw|music|game|อ่าน|หนังสือ|วาด|เล่น|ดนตรี)/i.test(title) ? "hobby"
          : /(rest|relax|nap|spa|self|skincare|พัก|นอน|ผ่อนคลาย)/i.test(title) ? "self-care"
          : /(shop|buy|grocery|market|ซื้อ|ตลาด|ช็อป)/i.test(title) ? "shopping"
          : "routine";
      } else if (cat === "Work") {
        sub = /(meeting|sync|call|standup|ประชุม)/i.test(title) ? "meeting"
          : /(project|task|deadline|โปรเจกต์|งาน)/i.test(title) ? "project"
          : "work-task";
      } else if (cat === "Study") {
        sub = /(exam|test|quiz|midterm|final|สอบ)/i.test(title) ? "exam"
          : /(homework|assignment|report|การบ้าน|รายงาน)/i.test(title) ? "assignment"
          : /(class|lecture|เรียน|วิชา)/i.test(title) ? "class"
          : "study-session";
      } else if (cat === "Health") {
        sub = /(gym|weight|ฟิต|ยิม)/i.test(title) ? "gym"
          : /(run|jog|วิ่ง)/i.test(title) ? "running"
          : /(yoga|pilates|โยคะ)/i.test(title) ? "yoga"
          : "exercise";
      } else if (cat === "Social") {
        sub = /(movie|cinema|หนัง)/i.test(title) ? "movie"
          : /(eat|lunch|dinner|breakfast|coffee|กิน|ข้าว|กาแฟ)/i.test(title) ? "dining"
          : /(party|club|ปาร์ตี้)/i.test(title) ? "party"
          : /(เที่ยว|trip|travel)/i.test(title) ? "outing"
          : "hangout";
      }
      const subMap = subCategoryCount.get(cat) ?? new Map();
      const subEntry = subMap.get(sub) ?? { count: 0, samples: new Set<string>() };
      subEntry.count += 1;
      if (subEntry.samples.size < 2) subEntry.samples.add(e.title.trim());
      subMap.set(sub, subEntry);
      subCategoryCount.set(cat, subMap);

      // Duration calc
      if (e.start_time && e.end_time) {
        const [sh, sm] = e.start_time.split(":").map(Number);
        const [eh, em] = e.end_time.split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        let diff = endMin - startMin;
        // Handle events that cross midnight (end <= start)
        if (diff < 0) diff += 24 * 60;
        // Skip invalid / zero-length entries
        if (diff > 0) totalDuration += diff;
      }
    });

    const peakHour = hourCount.reduce((a, b) => b.count > a.count ? b : a, hourCount[0]);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const busiestDayIdx = dayOfWeekCount.indexOf(Math.max(...dayOfWeekCount));
    const quietestDayIdx = dayOfWeekCount.indexOf(Math.min(...dayOfWeekCount));

    const categoryData = Array.from(categoryCount.entries())
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
      .sort((a, b) => b.value - a.value);

    const topCategory = categoryData[0]?.name || "Personal";
    const secondCategory = categoryData[1]?.name;
    const totalCount = periodEvents.length || 1;
    const topShare = (categoryData[0]?.value || 0) / totalCount;
    const topTwoShare = ((categoryData[0]?.value || 0) + (categoryData[1]?.value || 0)) / totalCount;

    // Get top sub-category within the dominant category
    const topSubMap = subCategoryCount.get(topCategory);
    const topSubs = topSubMap
      ? Array.from(topSubMap.entries())
          .map(([name, v]) => ({ name, count: v.count, samples: Array.from(v.samples) }))
          .sort((a, b) => b.count - a.count)
      : [];
    const topSub = topSubs[0];
    const sampleStr = topSub?.samples.slice(0, 2).join(", ") || "";

    // Monthly distribution for year view
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: MONTHS[i],
      count: events.filter(e => {
        const d = new Date(`${e.event_date}T00:00:00`);
        return d.getFullYear() === selectedYear && d.getMonth() === i;
      }).length,
    }));

    // Daily distribution for month view
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return {
        day: String(day),
        count: periodEvents.filter(e => e.event_date === dateStr).length,
      };
    });

    // Lifestyle insight — category-focused
    let lifestyleInsight = "";
    if (periodEvents.length === 0) {
      lifestyleInsight = t("insights.lifestyle.empty");
    } else if (topSub && sampleStr) {
      // Detailed: sub-category + real samples
      lifestyleInsight = t("insights.lifestyle.detailed", {
        category: topCategory.toLowerCase(),
        sub: topSub.name,
        samples: sampleStr,
      });
    } else if (secondCategory && topTwoShare >= 0.7) {
      lifestyleInsight = t("insights.lifestyle.twoCategories", {
        a: topCategory.toLowerCase(),
        b: secondCategory.toLowerCase(),
      });
    } else if (topCategory === "Work") {
      lifestyleInsight = t("insights.lifestyle.work", { day: dayNames[busiestDayIdx] });
    } else if (topCategory === "Study") {
      lifestyleInsight = t("insights.lifestyle.study", { hour: peakHour.hour });
    } else if (topCategory === "Health") {
      lifestyleInsight = t("insights.lifestyle.health");
    } else if (topCategory === "Social") {
      lifestyleInsight = t("insights.lifestyle.social");
    } else {
      lifestyleInsight = t("insights.lifestyle.focused", { category: topCategory.toLowerCase() });
    }

    let recommendation = "";
    if (periodEvents.length === 0) {
      recommendation = t("insights.rec.start");
    } else if (dayOfWeekCount[0] + dayOfWeekCount[6] > dayOfWeekCount.slice(1, 6).reduce((a, b) => a + b, 0) / 5 * 2) {
      recommendation = t("insights.rec.weekend");
    } else if (Number(peakHour.hour.split(":")[0]) >= 20) {
      recommendation = t("insights.rec.lateNight");
    } else if (categoryCount.size <= 1) {
      recommendation = t("insights.rec.diversify");
    } else {
      recommendation = t("insights.rec.quietest", { day: dayNames[quietestDayIdx] });
    }

    return {
      total: periodEvents.length,
      totalHours: Math.round(totalDuration / 60),
      avgPerDay: view === "month"
        ? (periodEvents.length / daysInMonth).toFixed(1)
        : (periodEvents.length / 365).toFixed(1),
      peakHour: peakHour.hour,
      busiestDay: dayNames[busiestDayIdx],
      categoryData,
      hourCount: hourCount.filter(h => h.count > 0).length > 0 ? hourCount : hourCount,
      timelineData: view === "month" ? dailyData : monthlyData,
      lifestyleInsight,
      recommendation,
    };
  }, [periodEvents, events, selectedMonth, selectedYear, view]);

  const handleShare = useCallback(async () => {
    if (!shareRef.current) return;
    try {
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], "my-insights.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "My Calendar Insights" });
          return;
        }
      }
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `insights-${view === "month" ? MONTHS[selectedMonth] : selectedYear}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("insights.shareSuccess"));
    } catch {
      toast.error(t("insights.shareFailed"));
    }
  }, [view, selectedMonth, selectedYear]);

  const periodLabel = view === "month"
    ? `${MONTHS[selectedMonth]} ${selectedYear}`
    : `${selectedYear}`;

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 z-10 flex items-center gap-3">
        <button onClick={() => navigate("/settings")} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-lg font-bold text-foreground">{t("insights.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("insights.subtitle")}</p>
        </div>
        <button onClick={handleShare} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center active:scale-95">
          <Share2 className="w-4 h-4 text-primary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isPreviewMode && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-xs text-foreground">
            {t("insights.previewBanner")}
          </div>
        )}

        {/* Period Selector */}
        <div className="flex gap-2">
          <div className="flex bg-secondary rounded-xl p-1 flex-1">
            <button
              onClick={() => setView("month")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${view === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setView("year")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${view === "year" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Yearly
            </button>
          </div>
          <button
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className="flex items-center gap-1 bg-secondary rounded-xl px-3 py-2 text-sm font-medium text-foreground"
          >
            {periodLabel}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Month/Year Picker */}
        {showMonthPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-card border border-border rounded-xl p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <button onClick={() => setSelectedYear(y => y - 1)} className="px-3 py-1 rounded-lg bg-secondary text-sm text-foreground">←</button>
              <span className="font-display font-bold text-foreground">{selectedYear}</span>
              <button onClick={() => setSelectedYear(y => y + 1)} className="px-3 py-1 rounded-lg bg-secondary text-sm text-foreground">→</button>
            </div>
            {view === "month" && (
              <div className="grid grid-cols-4 gap-1.5">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => { setSelectedMonth(i); setShowMonthPicker(false); }}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${selectedMonth === i ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
            {view === "year" && (
              <button onClick={() => setShowMonthPicker(false)} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                Done
              </button>
            )}
          </motion.div>
        )}

        {/* Shareable Card */}
        <div ref={shareRef} className="space-y-4">
          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { label: "Total Events", value: analytics.total, emoji: "📅" },
              { label: "Total Hours", value: `${analytics.totalHours}h`, emoji: "⏱️" },
              { label: "Avg/Day", value: analytics.avgPerDay, emoji: "📊" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-lg mb-0.5">{stat.emoji}</p>
                <p className="text-lg font-bold font-display text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Timeline Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {view === "month" ? "Daily Activity" : "Monthly Activity"}
            </h3>
            <p className="text-[11px] text-muted-foreground mb-3">
              {periodLabel}
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={analytics.timelineData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey={view === "month" ? "day" : "month"}
                  tick={{ fontSize: 9, fill: "hsl(220, 9%, 46%)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={view === "month" ? 4 : 0}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 91%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={2}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <h3 className="text-sm font-semibold text-foreground mb-3">Activity Breakdown</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie
                    data={analytics.categoryData.length > 0 ? analytics.categoryData : [{ name: "No data", value: 1, color: "hsl(220, 13%, 91%)" }]}
                    dataKey="value"
                    innerRadius={28}
                    outerRadius={44}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {(analytics.categoryData.length > 0 ? analytics.categoryData : [{ color: "hsl(220, 13%, 91%)" }]).map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {analytics.categoryData.length > 0 ? analytics.categoryData.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-foreground flex-1">{c.name}</span>
                    <span className="text-xs font-medium text-muted-foreground">{c.value}</span>
                  </div>
                )) : (
                  <p className="text-xs text-muted-foreground">{t("insights.lifestyle.empty")}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Peak Hours */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <h3 className="text-sm font-semibold text-foreground mb-1">Peak Hours</h3>
            <p className="text-[11px] text-muted-foreground mb-3">Most active at <strong className="text-foreground">{analytics.peakHour}</strong></p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={analytics.hourCount}>
                <XAxis dataKey="hour" hide />
                <YAxis hide />
                <Bar dataKey="count" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Lifestyle Insight Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-xl p-4 bg-gradient-to-br from-primary/10 via-accent/5 to-accent/10 border border-primary/20"
          >
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">🔍 Lifestyle Insight</p>
            <p className="text-sm text-foreground leading-relaxed">{analytics.lifestyleInsight}</p>
          </motion.div>

          {/* Recommendation Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl p-4 bg-gradient-to-br from-success/10 to-success/5 border border-success/20"
            style={{ "--success": "160 84% 39%" } as React.CSSProperties}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(160, 84%, 39%)" }}>💡 Recommendation</p>
            <p className="text-sm text-foreground leading-relaxed">{analytics.recommendation}</p>
          </motion.div>
        </div>

        {/* Share Button */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={handleShare}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Download className="w-4 h-4" />
          {t("common.export")}
        </motion.button>
      </div>
    </div>
  );
};

export default InsightsPage;
