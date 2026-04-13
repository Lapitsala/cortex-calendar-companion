export interface ParsedEvent {
  title: string;
  description: string | null;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string | null;
  location: string | null;
  priority: "high" | "medium" | "low";
}

function parseICSDate(value: string): { date: string; time: string } | null {
  // Formats: 20260413T090000Z, 20260413T090000, 20260413
  const clean = value.replace(/[^0-9TZ]/g, "");
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?Z?$/);
  if (!match) return null;
  const [, y, m, d, hh, mm] = match;
  return {
    date: `${y}-${m}-${d}`,
    time: hh && mm ? `${hh}:${mm}` : "00:00",
  };
}

function extractField(block: string, field: string): string | null {
  // Handle folded lines (lines starting with space/tab are continuations)
  const unfolded = block.replace(/\r?\n[ \t]/g, "");
  const regex = new RegExp(`^${field}[^:]*:(.*)$`, "m");
  const match = unfolded.match(regex);
  if (!match) return null;
  return match[1]
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\\\/g, "\\")
    .trim();
}

function mapPriority(val: string | null): "high" | "medium" | "low" {
  if (!val) return "medium";
  const n = parseInt(val, 10);
  if (n >= 1 && n <= 4) return "high";
  if (n >= 6) return "low";
  return "medium";
}

export function parseICS(content: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const blocks = content.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];

    const summary = extractField(block, "SUMMARY");
    if (!summary) continue;

    const dtStart = extractField(block, "DTSTART");
    if (!dtStart) continue;

    const start = parseICSDate(dtStart);
    if (!start) continue;

    const dtEnd = extractField(block, "DTEND");
    const end = dtEnd ? parseICSDate(dtEnd) : null;

    events.push({
      title: summary,
      description: extractField(block, "DESCRIPTION") || null,
      event_date: start.date,
      start_time: start.time,
      end_time: end?.time || null,
      location: extractField(block, "LOCATION") || null,
      priority: mapPriority(extractField(block, "PRIORITY")),
    });
  }

  return events;
}
