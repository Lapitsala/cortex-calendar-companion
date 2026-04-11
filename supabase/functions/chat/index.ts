import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, calendarContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const today = new Date().toISOString().split("T")[0];
    const calendarInfo = calendarContext
      ? `\n\nThe user's upcoming calendar events:\n${calendarContext}\n\nToday's date is ${today}.`
      : `\n\nToday's date is ${today}.`;

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
- Present available time slots clearly with day, date, and time
- Do NOT confuse shared calendars with group scheduling — they are separate features

GROUP SCHEDULING:
- When the user asks to find a common time for a GROUP, analyze the group members' availability
- Groups are separate from personal calendar shares
- Suggest 2-3 time slots that could work for everyone
- Consider typical working hours (9 AM - 6 PM) unless told otherwise
- Ask about meeting duration if not specified
- After the user confirms a time slot, create the event using the EVENT_CREATE block

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

IMPORTANT - Event Creation:
When the user confirms they want to create an event, include this exact block in your response (the system will parse it to create the event automatically):

[EVENT_CREATE]{"title": "Event Title", "date": "YYYY-MM-DD", "start_time": "H:MM AM/PM", "end_time": "H:MM AM/PM", "location": "Location", "priority": "high|medium|low", "description": "Brief description"}[/EVENT_CREATE]

Only include this block AFTER the user confirms the event details. Always ask for confirmation first.
${calendarInfo}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
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
