import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Web search tool implementation -----------------------------------------
// Uses DuckDuckGo's HTML endpoint (no API key required) and returns the top
// results as a compact text block the model can ground its answer on.
async function runWebSearch(query: string): Promise<string> {
  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
      },
    });
    if (!res.ok) return `No web results (status ${res.status}).`;
    const html = await res.text();

    // Extract result blocks: <a class="result__a" href="...">TITLE</a> ... <a class="result__snippet">SNIPPET</a>
    const results: { title: string; url: string; snippet: string }[] = [];
    const blockRe =
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    const strip = (s: string) =>
      s
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    while ((m = blockRe.exec(html)) !== null && results.length < 8) {
      let href = m[1];
      // DDG wraps links like /l/?uddg=<encoded>
      const ud = href.match(/[?&]uddg=([^&]+)/);
      if (ud) {
        try {
          href = decodeURIComponent(ud[1]);
        } catch { /* ignore */ }
      }
      results.push({ url: href, title: strip(m[2]), snippet: strip(m[3]) });
    }
    if (results.length === 0) return "No web results found.";
    return results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`)
      .join("\n\n");
  } catch (e) {
    console.error("web_search failed:", e);
    return `Web search failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

const webSearchTool = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "Search the public web for up-to-date information about events, concerts, news, products, places, ticket sales, etc. Use this whenever the user asks about something that may not be in your training data, especially real-world events with dates, venues, prices, or ticket links.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A focused web search query (English or Thai). Include the event name, year/date, and country/venue when relevant.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, calendarContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1; // 1-12
    const dateRules = `

CRITICAL DATE & TIME RULES (read carefully):
- Today's date is ${today} (year=${currentYear}, month=${currentMonth}).
- The CURRENT YEAR is ${currentYear}. Unless the user explicitly states a different year, ALL relative date expressions refer to the current year ${currentYear} or later — NEVER a past year.
- "this month" = month ${currentMonth} of ${currentYear}.
- "next month" = the month immediately after ${currentMonth}/${currentYear} (if ${currentMonth} is 12, then January of ${currentYear + 1}). It does NOT mean "next month of every year".
- "next week", "tomorrow", "in N days/weeks/months" are always counted forward from ${today}.
- When the user asks about availability/free time/events for a period (e.g. "เดือนหน้าฉันว่างตอนไหนบ้าง" / "when am I free next month"), you MUST ONLY consider events whose date falls within that exact period of the current/next year. IGNORE any event with a date in a previous year or outside the asked period — even if it appears in the context.
- Never aggregate the same calendar month across multiple years. Each event date is a single specific calendar day (YYYY-MM-DD); treat it literally.
- If an event in the provided context has a date in the past (before ${today}), do NOT use it to answer questions about future availability or upcoming schedule.
- When emitting EVENT_CREATE / EVENT_UPDATE / GROUP_EVENT_CREATE blocks, always use a full YYYY-MM-DD date in the current or future year — never a past date.
`;
    const calendarInfo = calendarContext
      ? `${dateRules}\n\nThe user's upcoming calendar events:\n${calendarContext}`
      : dateRules;

    const systemPrompt = `You are Cortex, a friendly and helpful AI calendar assistant. You help users manage their schedule, plan events, set goals, and stay organized.

Key behaviors:
- Be concise and friendly
- Use markdown formatting (bold, lists, emojis) for clarity
- When users want to schedule something, confirm the details before creating
- When asked about the week/schedule, provide organized summaries
- For goal planning, break goals into actionable steps
- Always be encouraging and proactive with suggestions
- If the user's request is unclear, ask for clarification
- If there's a scheduling conflict, point it out and suggest alternatives

SHARED CALENDARS (Personal Sharing):
- The user may have shared calendars from other people (listed under "Shared calendars" in the context)
- These are PERSONAL calendar shares, NOT group calendars
- When the user asks about someone's free time/availability (e.g. "When is Bob free?"), check their shared calendar events
- A person is BUSY during their scheduled events and FREE at other times
- When finding common free time, compare the user's events with the shared person's events
- PRIVACY (CRITICAL): For OTHER people's calendars (shared calendars), NEVER reveal specific busy time ranges, event titles, locations, or details. Only say things like "they are busy during this period" or "they are not available in the morning/afternoon/evening of [date]". Do NOT say "busy from 2:00 PM to 4:00 PM" — instead say "busy in the afternoon" or just "not free at that time".
- For the USER'S OWN events and FREE time slots, you CAN show specific times normally.
- When suggesting common free time slots, show the actual free time ranges (those are safe to show) — just don't expose the other person's busy details.
- Do NOT confuse shared calendars with group scheduling — they are separate features

GROUP SCHEDULING:
- When the user asks to find a common time for a GROUP, analyze the group members' availability
- Groups are separate from personal calendar shares
- Suggest 2-3 time slots that could work for everyone
- Consider typical working hours (9 AM - 6 PM) unless told otherwise
- Ask about meeting duration if not specified
- After the user confirms a time slot, create the event using the EVENT_CREATE block

GROUP EVENT CONFLICT CHECK (CRITICAL):
- When the user asks to create a GROUP event at a SPECIFIC fixed time (e.g. "นัดกลุ่ม X พรุ่งนี้ 14:00-16:00"), BEFORE creating the event you MUST check the busy slots of every accepted member of that group (provided in the context as "BUSY slots").
- A member has a CONFLICT if any of their busy slots overlaps with the requested time range on that date.
- If there are conflicts:
  1. DO NOT emit the GROUP_EVENT_CREATE block yet.
  2. Clearly list WHICH members are not available at the requested time (use their name from the context). For privacy, do NOT reveal the title/details of their conflicting events — just say they have a conflict at that time.
  3. Suggest 2-3 alternative time slots (same day if possible, otherwise nearby days within the next 7 days) where ALL members are free, presented as a numbered list of choices, e.g.:
     **Suggested alternatives:**
     1. Tomorrow (2025-04-17) 10:00-12:00 — everyone free
     2. Tomorrow (2025-04-17) 16:00-18:00 — everyone free
     3. 2025-04-18 14:00-16:00 — everyone free
  4. Ask the user to pick one, or to insist on the original conflicting time.
- Only AFTER the user picks a slot (or explicitly confirms the conflicting time anyway), emit the GROUP_EVENT_CREATE block.
- If there are NO conflicts, confirm the details with the user once, then emit the GROUP_EVENT_CREATE block.

GOOGLE CLASSROOM:
- The user's Google Classroom assignments may be listed in the context
- When asked about homework, assignments, deadlines, or coursework, refer to this data
- Help users prioritize assignments based on due dates and status (overdue > due_soon > upcoming)
- Suggest study plans based on assignment deadlines
- When the user wants to add an assignment to the calendar, use EVENT_CREATE with the assignment details

IMAGE/OCR HANDLING:
- When the user sends an image, carefully analyze it for any event-related information
- Extract: dates, times, locations, event titles, deadlines, assignments, schedules
- Present what you found in a clear summary
- If information is incomplete, ask the user for the missing details
- After presenting extracted info, ask the user if they want to create calendar events from it
- If the image is unreadable or has no event data, let the user know and ask for a clearer image

WEB SEARCH (CRITICAL — USE PROACTIVELY):
- You have access to a tool called "web_search" that performs a real-time public web search.
- USE IT whenever the user asks about a real-world event, concert, festival, conference, sport match, movie release, product launch, news, place, ticket sale, or anything time-sensitive that may not be in your training data.
- Examples that MUST trigger web_search: "มีคอนเสิร์ต BTS ที่ไทย 3 ธันวา ไปได้ไหม", "When does Taylor Swift perform in Bangkok?", "Where can I buy tickets for Coldplay 2026?", "หนังเรื่อง X เข้าฉายเมื่อไหร่".
- You MAY call web_search multiple times (e.g. one query for event details, another for ticket info) before answering.
- After getting search results, summarize the relevant facts (full event name, venue, date(s), city/country, ticket sale dates, ticket link/source) in your reply, then check the user's calendar for conflicts on that date and answer their question (e.g. "ไปได้ไหม").
- If the user then confirms they want to add it, emit an EVENT_CREATE block as usual.
- If web_search returns no useful results, tell the user honestly instead of guessing.

IMPORTANT - Event Creation:
When the user confirms they want to create a PERSONAL event, include this exact block in your response (the system will parse it to create the event automatically):

[EVENT_CREATE]{"title": "Event Title", "date": "YYYY-MM-DD", "start_time": "H:MM AM/PM", "end_time": "H:MM AM/PM", "location": "Location", "priority": "high|medium|low", "description": "Brief description"}[/EVENT_CREATE]

EVENT MODIFICATION (UPDATE):
- When the user asks to MODIFY, EDIT, RESCHEDULE, RENAME, MOVE, or CHANGE an existing personal event (e.g. "เลื่อน meeting พรุ่งนี้เป็น 4 โมง", "change Math class location to Room B", "rename 'Lunch' to 'Lunch with Alex'"), find the matching event from the user's upcoming calendar list in the context.
- Confirm with the user which event you'll change and what the new values are, then emit this block (the system will look up the event by "match_title" + optional "match_date" and apply only the fields you provide):

[EVENT_UPDATE]{"match_title": "Existing event title", "match_date": "YYYY-MM-DD", "title": "New title (optional)", "date": "YYYY-MM-DD (optional)", "start_time": "H:MM AM/PM (optional)", "end_time": "H:MM AM/PM (optional)", "location": "New location (optional)", "priority": "high|medium|low (optional)", "description": "New description (optional)"}[/EVENT_UPDATE]

- "match_title" should match the existing event title as closely as possible (case-insensitive partial match is OK).
- Only include the fields the user wants to change. Omit unchanged fields.
- If multiple events could match, ask the user to clarify which one before emitting the block.
- If no matching event exists in the context, tell the user and do NOT emit the block.

GROUP EVENT Creation:
When the user wants to create an event for a GROUP (e.g. "นัดกลุ่ม X ..." or "schedule a meeting for group X"), use this block instead. The group_name must match one of the user's groups exactly:

[GROUP_EVENT_CREATE]{"group_name": "Group Name", "title": "Event Title", "date": "YYYY-MM-DD", "start_time": "H:MM AM/PM", "end_time": "H:MM AM/PM", "location": "Location", "description": "Brief description"}[/GROUP_EVENT_CREATE]

Only include these blocks AFTER the user confirms the event details. Always ask for confirmation first.
${calendarInfo}`;

    // Tool-calling loop: do up to N non-streaming passes to resolve any
    // web_search tool calls, then stream the FINAL answer to the client.
    const convo: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const MAX_TOOL_ROUNDS = 3;
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const planRes = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: convo,
          tools: [webSearchTool],
          tool_choice: "auto",
        }),
      });

      if (!planRes.ok) {
        if (planRes.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (planRes.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await planRes.text();
        console.error("AI gateway error (plan):", planRes.status, t);
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const planData = await planRes.json();
      const choice = planData.choices?.[0];
      const msg = choice?.message;
      const toolCalls = msg?.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        // No tool requested — break out and stream the final answer below.
        // If the model already produced text in this non-stream call, just
        // return it as a single SSE chunk so the client renders it.
        const finalText: string = msg?.content || "";
        const sse =
          `data: ${JSON.stringify({ choices: [{ delta: { content: finalText } }] })}\n\n` +
          `data: [DONE]\n\n`;
        return new Response(sse, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // Execute every tool call, append results, loop again.
      convo.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: toolCalls,
      });
      for (const tc of toolCalls) {
        if (tc.function?.name === "web_search") {
          let q = "";
          try {
            q = JSON.parse(tc.function.arguments || "{}").query || "";
          } catch { /* ignore */ }
          console.log("web_search query:", q);
          const result = q ? await runWebSearch(q) : "Empty query.";
          convo.push({
            role: "tool",
            tool_call_id: tc.id,
            content: `Web search results for "${q}":\n\n${result}`,
          });
        } else {
          convo.push({
            role: "tool",
            tool_call_id: tc.id,
            content: `Unknown tool: ${tc.function?.name}`,
          });
        }
      }
    }

    // After tool rounds — stream the final answer (no tools this time).
    const finalRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: convo,
        stream: true,
      }),
    });

    if (!finalRes.ok) {
      if (finalRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (finalRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await finalRes.text();
      console.error("AI gateway error (final):", finalRes.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(finalRes.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
