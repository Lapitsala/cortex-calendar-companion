import { useState, useEffect, useCallback } from "react";

export interface Course {
  id: string;
  name: string;
  section: string;
  teacher: string;
  color: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  dueDate: string;
  dueTime: string;
  points: number;
  status: "upcoming" | "due_soon" | "overdue" | "submitted";
  description: string;
}

const COURSES_KEY = "classroom_courses";
const ASSIGNMENTS_KEY = "classroom_assignments";
const SYNCED_IDS_KEY = "classroom_synced_ids";

const DEFAULT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(220, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 55%, 45%)",
];

export const useClassroomData = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(SYNCED_IDS_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });

  useEffect(() => {
    const rawC = localStorage.getItem(COURSES_KEY);
    const rawA = localStorage.getItem(ASSIGNMENTS_KEY);
    if (rawC) setCourses(JSON.parse(rawC));
    if (rawA) setAssignments(JSON.parse(rawA));
  }, []);

  const saveSyncedIds = (ids: Set<string>) => {
    setSyncedIds(ids);
    localStorage.setItem(SYNCED_IDS_KEY, JSON.stringify([...ids]));
  };

  const importData = useCallback((newCourses: Course[], newAssignments: Assignment[]) => {
    setCourses(newCourses);
    setAssignments(newAssignments);
    localStorage.setItem(COURSES_KEY, JSON.stringify(newCourses));
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(newAssignments));
    // Reset synced state for new data
    localStorage.removeItem(SYNCED_IDS_KEY);
    setSyncedIds(new Set());
  }, []);

  const clearAll = useCallback(() => {
    setCourses([]);
    setAssignments([]);
    setSyncedIds(new Set());
    localStorage.removeItem(COURSES_KEY);
    localStorage.removeItem(ASSIGNMENTS_KEY);
    localStorage.removeItem(SYNCED_IDS_KEY);
  }, []);

  const hasData = courses.length > 0 || assignments.length > 0;

  return { courses, assignments, syncedIds, saveSyncedIds, importData, clearAll, hasData, DEFAULT_COLORS };
};
