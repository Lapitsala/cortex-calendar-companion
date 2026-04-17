import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Calendar, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useClassroomData } from "@/hooks/useClassroomData";
import { useTranslation } from "@/i18n/LanguageProvider";

const statusConfig = {
  upcoming: { label: "Upcoming", color: "text-muted-foreground", bg: "bg-secondary", icon: Clock },
  due_soon: { label: "Due Soon", color: "text-warning", bg: "bg-warning/15", icon: AlertCircle },
  overdue: { label: "Overdue", color: "text-destructive", bg: "bg-destructive/15", icon: AlertCircle },
  submitted: { label: "Submitted", color: "text-success", bg: "bg-success/15", icon: CheckCircle2 },
};

type TabType = "all" | "due_soon" | "upcoming" | "submitted";

const ClassroomPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const { courses, assignments, hasData, loading, markSynced } = useClassroomData();
  const { createEvent } = useCalendarEvents();
  const { t } = useTranslation();
  const autoSyncDone = useRef(false);

  const REMINDER_PREFIX = "⏰ ";

  const getCourse = (courseId: string) => courses.find((c) => c.id === courseId);

  const syncAssignmentToCalendar = useCallback(async (assignment: typeof assignments[0]) => {
    const course = getCourse(assignment.courseId);
    await createEvent({
      title: `${REMINDER_PREFIX}${assignment.title}`,
      description: `[Reminder] ${course?.name || "Unknown"}\n${assignment.description}\nPoints: ${assignment.points}`,
      event_date: assignment.dueDate,
      start_time: assignment.dueTime,
      end_time: null,
      location: null,
      priority: assignment.status === "overdue" ? "high" : assignment.status === "due_soon" ? "medium" : "low",
    });
  }, [createEvent, courses]);

  // Auto-sync on mount
  useEffect(() => {
    if (autoSyncDone.current || loading || assignments.length === 0) return;
    autoSyncDone.current = true;

    const toSync = assignments.filter(a => a.status !== "submitted" && !a.isSynced);
    if (toSync.length === 0) return;

    (async () => {
      let count = 0;
      for (const a of toSync) {
        try {
          await syncAssignmentToCalendar(a);
          await markSynced(a.id);
          count++;
        } catch {}
      }
      if (count > 0) {
        toast.success(`Auto-synced ${count} assignments to calendar`);
      }
    })();
  }, [assignments, loading, syncAssignmentToCalendar, markSynced]);

  const filteredAssignments = assignments.filter((a) => {
    if (selectedCourse && a.courseId !== selectedCourse) return false;
    if (activeTab === "all") return true;
    if (activeTab === "due_soon") return a.status === "due_soon" || a.status === "overdue";
    return a.status === activeTab;
  });

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: assignments.filter(a => !selectedCourse || a.courseId === selectedCourse).length },
    { key: "due_soon", label: "Due Soon", count: assignments.filter(a => (!selectedCourse || a.courseId === selectedCourse) && (a.status === "due_soon" || a.status === "overdue")).length },
    { key: "upcoming", label: "Upcoming", count: assignments.filter(a => (!selectedCourse || a.courseId === selectedCourse) && a.status === "upcoming").length },
    { key: "submitted", label: "Done", count: assignments.filter(a => (!selectedCourse || a.courseId === selectedCourse) && a.status === "submitted").length },
  ];

  if (loading) {
    return (
      <div className="flex flex-col h-[100dvh] pb-20 bg-background items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex flex-col h-[100dvh] pb-20 bg-background">
        <div className="bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-display text-lg font-bold text-foreground">Classroom</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-3">
            <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-semibold text-foreground">{t("classroom.empty.title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("classroom.empty.hint", { nav: "" })}
              <span className="text-primary font-medium">{t("nav.settings")} → {t("settings.importClassroom")}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-display text-lg font-bold text-foreground">Classroom</h1>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-success font-medium bg-success/10 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Auto-Sync
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
              !selectedCourse ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            All Courses
          </button>
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 flex items-center gap-1.5 ${
                selectedCourse === course.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color }} />
              {course.name.split(" ").slice(0, 2).join(" ")}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                activeTab === tab.key ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredAssignments.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-muted-foreground text-sm">
              No assignments found
            </motion.div>
          ) : (
            filteredAssignments.map((assignment, i) => {
              const course = getCourse(assignment.courseId);
              const config = statusConfig[assignment.status];
              const StatusIcon = config.icon;

              return (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border rounded-xl p-3.5 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-1 h-full min-h-[40px] rounded-full shrink-0" style={{ backgroundColor: course?.color || "hsl(var(--primary))" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground leading-tight">{assignment.title}</h4>
                        <span className={`shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{assignment.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(assignment.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {assignment.dueTime}
                          </span>
                          {assignment.points > 0 && (
                            <span className="text-foreground/70 font-medium">{assignment.points} pts</span>
                          )}
                        </div>
                        {assignment.status !== "submitted" && (
                          <span
                            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg ${
                              assignment.isSynced ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {assignment.isSynced ? (
                              <><CheckCircle2 className="w-3 h-3" /> Synced</>
                            ) : (
                              <><Clock className="w-3 h-3" /> Syncing...</>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClassroomPage;
