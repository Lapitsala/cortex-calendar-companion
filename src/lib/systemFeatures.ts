export type FeatureStatus = "implemented" | "partial" | "planned";

export interface SystemFeature {
  id: string;
  title: string;
  summary: string;
  status: FeatureStatus;
  outcomes: string[];
  nextMilestone: string;
}

export const systemFeatures: SystemFeature[] = [
  {
    id: "FR-01",
    title: "Conversational calendar management",
    summary: "Use natural language to create, update, delete, and query events.",
    status: "partial",
    outcomes: [
      "Interpret temporal, location, participant, and recurrence expressions.",
      "Convert chat intent into structured calendar operations.",
    ],
    nextMilestone: "Enable assistant-confirmed event writes directly from chat suggestions.",
  },
  {
    id: "FR-02",
    title: "Goal-based planning and roadmap generation",
    summary: "Break long-term goals into actionable plans scheduled over time.",
    status: "planned",
    outcomes: [
      "Generate milestones and focus blocks from goals.",
      "Respect working hours and deadline buffer preferences.",
    ],
    nextMilestone: "Ship a roadmap generator service and planning UI timeline.",
  },
  {
    id: "FR-03",
    title: "Privacy-aware group scheduling",
    summary: "Find meeting slots across participants while preserving privacy.",
    status: "partial",
    outcomes: [
      "Compute overlap windows from free/busy data.",
      "Hide event details from non-owners.",
    ],
    nextMilestone: "Add shared free/busy interval computation and candidate-slot ranking.",
  },
  {
    id: "FR-04",
    title: "Event intelligence and conflict handling",
    summary: "Use event priority to detect conflicts and suggest safe resolutions.",
    status: "partial",
    outcomes: [
      "Score event importance with user preferences and deadlines.",
      "Propose constrained reschedules for lower-priority items.",
    ],
    nextMilestone: "Introduce automatic conflict detection with explainable recommendations.",
  },
  {
    id: "FR-05",
    title: "Event detail enhancement and contextual assistance",
    summary: "Provide context-aware recommendations and event-focused chat guidance.",
    status: "partial",
    outcomes: [
      "Show preparation tips based on event type.",
      "Offer situational advice like weather readiness.",
    ],
    nextMilestone: "Integrate weather/context providers into event detail sheets.",
  },
  {
    id: "FR-06",
    title: "Event archiving and retrieval",
    summary: "Archive completed events for searchable historical retrieval.",
    status: "planned",
    outcomes: [
      "Keep history without hard-delete loss.",
      "Allow filtered search by archived and active state.",
    ],
    nextMilestone: "Add archived state, archive actions, and archived list filters.",
  },
  {
    id: "FR-07",
    title: "Related event linking and navigation",
    summary: "Associate events and tasks to surface connected schedule context.",
    status: "planned",
    outcomes: [
      "Model parent-child and related-item links.",
      "Enable one-tap navigation across related entries.",
    ],
    nextMilestone: "Deliver relation schema and linked-items panel in event detail.",
  },
  {
    id: "FR-08",
    title: "Camera and brochure/poster recognition",
    summary: "Extract event details from photos and propose event creation.",
    status: "partial",
    outcomes: [
      "Capture image input from camera/gallery.",
      "Parse candidate date, time, and location with clarifications.",
    ],
    nextMilestone: "Add extraction confidence display and ambiguity resolution prompts.",
  },
  {
    id: "FR-09",
    title: "External platform integrations",
    summary: "Import assignments/deadlines and schedule them through chat.",
    status: "planned",
    outcomes: [
      "Sync external tasks as unscheduled work items.",
      "Turn imported tasks into focus sessions with constraints.",
    ],
    nextMilestone: "Build integration adapters and imported-task scheduling flow.",
  },
  {
    id: "FR-10",
    title: "Collaboration and sharing",
    summary: "Share events across teammates with consistent event state.",
    status: "partial",
    outcomes: [
      "Maintain synchronized shared-event metadata.",
      "Apply privacy-preserving access controls.",
    ],
    nextMilestone: "Expand shared-event editing and participant role permissions.",
  },
  {
    id: "FR-11",
    title: "Chat history management",
    summary: "Preserve incomplete sessions and archive finalized conversations.",
    status: "partial",
    outcomes: [
      "Resume incomplete event/planning chats.",
      "Retain read-only history for traceability.",
    ],
    nextMilestone: "Add explicit finalize/archive controls and immutable transcript mode.",
  },
  {
    id: "FR-12",
    title: "Onboarding and preference learning",
    summary: "Collect preferences at onboarding and adapt over time with control.",
    status: "partial",
    outcomes: [
      "Authenticate with common providers.",
      "Store and apply user scheduling preferences transparently.",
    ],
    nextMilestone: "Ship onboarding wizard and preference-learning feedback loop.",
  },
  {
    id: "FR-13",
    title: "Analytics and Wrapped summaries",
    summary: "Provide periodic insights with privacy-first analytics processing.",
    status: "partial",
    outcomes: [
      "Deliver monthly/yearly productivity summaries.",
      "Prefer local computation for sensitive behavioral analytics.",
    ],
    nextMilestone: "Add saved wrapped reports and fine-grained privacy controls.",
  },
];

export const featureStatusLabel: Record<FeatureStatus, string> = {
  implemented: "Implemented",
  partial: "In Progress",
  planned: "Planned",
};
