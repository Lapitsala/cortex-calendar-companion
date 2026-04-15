import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  isSynced: boolean;
}

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
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setCourses([]);
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [cRes, aRes] = await Promise.all([
      supabase.from("classroom_courses").select("*").eq("user_id", user.id),
      supabase.from("classroom_assignments").select("*").eq("user_id", user.id),
    ]);

    if (cRes.data) {
      setCourses(cRes.data.map(c => ({
        id: c.id,
        name: c.name,
        section: c.section,
        teacher: c.teacher,
        color: c.color,
      })));
    }
    if (aRes.data) {
      setAssignments(aRes.data.map(a => ({
        id: a.id,
        courseId: a.course_id,
        title: a.title,
        dueDate: a.due_date,
        dueTime: a.due_time,
        points: a.points,
        status: a.status as Assignment["status"],
        description: a.description,
        isSynced: a.is_synced,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const importData = useCallback(async (newCourses: Course[], newAssignments: Assignment[]) => {
    if (!user) return;

    // Delete existing data first
    await supabase.from("classroom_assignments").delete().eq("user_id", user.id);
    await supabase.from("classroom_courses").delete().eq("user_id", user.id);

    // Insert courses and get back IDs
    const courseIdMap = new Map<string, string>(); // old id -> new uuid
    for (const c of newCourses) {
      const { data } = await supabase.from("classroom_courses").insert({
        user_id: user.id,
        name: c.name,
        section: c.section,
        teacher: c.teacher,
        color: c.color,
      }).select("id").single();
      if (data) courseIdMap.set(c.id, data.id);
    }

    // Insert assignments with mapped course IDs
    const assignmentRows = newAssignments
      .filter(a => courseIdMap.has(a.courseId))
      .map(a => ({
        user_id: user.id,
        course_id: courseIdMap.get(a.courseId)!,
        title: a.title,
        description: a.description,
        due_date: a.dueDate,
        due_time: a.dueTime,
        points: a.points,
        status: a.status,
        is_synced: false,
      }));

    if (assignmentRows.length > 0) {
      await supabase.from("classroom_assignments").insert(assignmentRows);
    }

    await fetchData();
  }, [user, fetchData]);

  const markSynced = useCallback(async (assignmentId: string) => {
    await supabase.from("classroom_assignments").update({ is_synced: true }).eq("id", assignmentId);
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, isSynced: true } : a));
  }, []);

  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase.from("classroom_assignments").delete().eq("user_id", user.id);
    await supabase.from("classroom_courses").delete().eq("user_id", user.id);
    setCourses([]);
    setAssignments([]);
  }, [user]);

  const hasData = courses.length > 0 || assignments.length > 0;

  return { courses, assignments, loading, importData, clearAll, hasData, markSynced, DEFAULT_COLORS, fetchData };
};
