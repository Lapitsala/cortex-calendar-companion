import { CalendarEvent } from "@/hooks/useCalendarEvents";

/** Convert "9:00", "9:00 AM", "14:30" → minutes since midnight. */
export const timeToMinutes = (timeStr: string | null | undefined): number => {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toLowerCase();
  const isPM = cleaned.includes("pm");
  const isAM = cleaned.includes("am");
  const numeric = cleaned.replace(/[ap]m/i, "").trim();
  const [hStr, mStr] = numeric.split(":");
  let h = parseInt(hStr) || 0;
  const m = parseInt(mStr) || 0;
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
};

export interface TimeRange {
  event_date: string;
  start_time: string;
  end_time: string | null;
}

/** Default duration when end_time is missing (1 hour). */
const DEFAULT_DURATION_MIN = 60;

const getRange = (e: TimeRange) => {
  const start = timeToMinutes(e.start_time);
  const end = e.end_time ? timeToMinutes(e.end_time) : start + DEFAULT_DURATION_MIN;
  return { start, end: Math.max(end, start + 1) };
};

/** Returns true when two events on the same date overlap in time. */
export const eventsOverlap = (a: TimeRange, b: TimeRange): boolean => {
  if (a.event_date !== b.event_date) return false;
  const ra = getRange(a);
  const rb = getRange(b);
  return ra.start < rb.end && rb.start < ra.end;
};

/** Find existing events that conflict with a candidate event. */
export const findConflicts = (
  candidate: TimeRange,
  existing: CalendarEvent[],
  excludeId?: string,
): CalendarEvent[] => {
  return existing.filter(
    (e) => e.id !== excludeId && eventsOverlap(candidate, e),
  );
};

const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export const priorityRank = (p: string) => PRIORITY_RANK[p] ?? 0;
