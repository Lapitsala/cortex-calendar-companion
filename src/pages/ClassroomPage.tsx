import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Calendar, Clock, CheckCircle2, AlertCircle, ChevronRight, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

interface Course {
  id: string;
  name: string;
  section: string;
  teacher: string;
  color: string;
}

interface Assignment {
  id: string;
  courseId: string;
  title: string;
  dueDate: string;
  dueTime: string;
  points: number;
  status: "upcoming" | "due_soon" | "overdue" | "submitted";
  description: string;
}

const MOCK_COURSES: Course[] = [
  { id: "c1", name: "Computer Science 101", section: "Section A", teacher: "Dr. Smith", color: "hsl(var(--primary))" },
  { id: "c2", name: "Mathematics II", section: "Section B", teacher: "Prof. Johnson", color: "hsl(var(--warning))" },
  { id: "c3", name: "Physics Lab", section: "Section C", teacher: "Dr. Lee", color: "hsl(var(--success))" },
  { id: "c4", name: "English Literature", section: "Section A", teacher: "Ms. Davis", color: "hsl(var(--destructive))" },
];

const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: "a1", courseId: "c1", title: "Algorithm Analysis Report", dueDate: "2026-04-14", dueTime: "23:59", points: 100, status: "due_soon", description: "Write a report on time complexity of sorting algorithms" },
  { id: "a2", courseId: "c1", title: "Lab 5: Binary Trees", dueDate: "2026-04-18", dueTime: "17:00", points: 50, status: "upcoming", description: "Implement BST operations" },
  { id: "a3", courseId: "c2", title: "Problem Set 7", dueDate: "2026-04-13", dueTime: "09:00", points: 80, status: "due_soon", description: "Integration and derivatives" },
  { id: "a4", courseId: "c2", title: "Midterm Review", dueDate: "2026-04-20", dueTime: "12:00", points: 0, status: "upcoming", description: "Review chapters 1-7" },
  { id: "a5", courseId: "c3", title: "Lab Report: Optics", dueDate: "2026-04-11", dueTime: "23:59", points: 75, status: "overdue", description: "Submit lab report for optics experiment" },
  { id: "a6", courseId: "c3", title: "Pre-lab: Thermodynamics", dueDate: "2026-04-16", dueTime: "08:00", points: 20, status: "upcoming", description: "Complete pre-lab questions" },
  { id: "a7", courseId: "c4", title: "Essay: Shakespeare", dueDate: "2026-04-10", dueTime: "23:59", points: 150, status: "submitted", description: "Analysis of Hamlet Act 3" },
  { id: "a8", courseId: "c4", title: "Reading Response Ch.12", dueDate: "2026-04-15", dueTime: "23:59", points: 30, status: "due_soon", description: "One-page response to chapter 12" },
];

const SYNCED_IDS_KEY = "classroom_synced_ids";

const loadSyncedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SYNCED_IDS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
};

const saveSyncedIds = (ids: Set<string>) => {
  localStorage.setItem(SYNCED_IDS_KEY, JSON.stringify([...ids]));
};

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
  const [syncedIds, setSyncedIds] = useState<Set<string>>(loadSyncedIds);
  const [isConnected] = useState(true);
  const { createEvent, events } = useCalendarEvents();
  const autoSyncDone = useRef(false);

  const getCourse = (courseId: string) => MOCK_COURSES.find((c) => c.id === courseId)!;

  // Reminder prefix to distinguish from regular events
  const REMINDER_PREFIX = "⏰ ";

  const syncAssignmentToCalendar = useCallback(async (assignment: Assignment) => {
    const course = getCourse(assignment.courseId);
    await createEvent({
      title: `${REMINDER_PREFIX}${assignment.title}`,
      description: `[Reminder] ${course.name}\n${assignment.description}\nPoints: ${assignment.points}`,
      event_date: assignment.dueDate,
      start_time: assignment.dueTime,
      end_time: null,
      location: null,
      priority: assignment.status === "overdue" ? "high" : assignment.status === "due_soon" ? "medium" : "low",
    });
  }, [createEvent]);

  // Auto-sync on mount: sync any unsynced, non-submitted assignments
  useEffect(() => {
    if (autoSyncDone.current) return;
    autoSyncDone.current = true;

    const toSync = MOCK_ASSIGNMENTS.filter(
      (a) => a.status !== "submitted" && !syncedIds.has(a.id)
    );
    if (toSync.length === 0) return;

    (async () => {
      const newSynced = new Set(syncedIds);
      let count = 0;
      for (const a of toSync) {
        try {
          await syncAssignmentToCalendar(a);
          newSynced.add(a.id);
          count++;
        } catch {
          // skip failed ones silently
        }
      }
      if (count > 0) {
        setSyncedIds(newSynced);
        saveSyncedIds(newSynced);
        toast.success(`Auto-synced ${count} assignments to calendar`);
      }
    })();
  }, [syncedIds, syncAssignmentToCalendar]);

  const filteredAssignments = MOCK_ASSIGNMENTS.filter((a) => {
    if (selectedCourse && a.courseId !== selectedCourse) return false;
    if (activeTab === "all") return true;
    if (activeTab === "due_soon") return a.status === "due_soon" || a.status === "overdue";
    return a.status === activeTab;
  });

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: MOCK_ASSIGNMENTS.filter((a) => !selectedCourse || a.courseId === selectedCourse).length },
    { key: "due_soon", label: "Due Soon", count: MOCK_ASSIGNMENTS.filter((a) => (!selectedCourse || a.courseId === selectedCourse) && (a.status === "due_soon" || a.status === "overdue")).length },
    { key: "upcoming", label: "Upcoming", count: MOCK_ASSIGNMENTS.filter((a) => (!selectedCourse || a.courseId === selectedCourse) && a.status === "upcoming").length },
    { key: "submitted", label: "Done", count: MOCK_ASSIGNMENTS.filter((a) => (!selectedCourse || a.courseId === selectedCourse) && a.status === "submitted").length },
  ];

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-display text-lg font-bold text-foreground">Classroom</h1>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="flex items-center gap-1 text-[10px] text-success font-medium bg-success/10 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Auto-Sync
              </span>
            )}
          </div>
        </div>

        {/* Course chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
              !selectedCourse ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            All Courses
          </button>
          {MOCK_COURSES.map((course) => (
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

      {/* Tabs */}
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

      {/* Assignment list */}
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
              const isSynced = syncedIds.has(assignment.id);

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
                    <div className="w-1 h-full min-h-[40px] rounded-full shrink-0" style={{ backgroundColor: course.color }} />
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
                              isSynced
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isSynced ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Synced
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                Syncing...
                              </>
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
