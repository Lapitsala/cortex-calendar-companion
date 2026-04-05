# Cortex Calendar Companion

Cortex is an AI-first calendar assistant focused on conversational planning, privacy-aware collaboration, and productivity insights.

## Lovable Preview & Feasibility Support

This project now supports a **preview mode** so the app remains usable on Lovable even when Supabase environment variables are not available in preview.

- If `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are present, Cortex uses live Supabase.
- If they are missing, Cortex falls back to local preview data and keeps core interactions (calendar + insights) functional.

## System Features (FR-01 to FR-13)

The app includes a **System Feature Progress** view in `Insights`, which tracks delivery status and next milestones for all required SRS features:

- FR-01 Conversational calendar management
- FR-02 Goal-based planning and roadmap generation
- FR-03 Privacy-aware group scheduling
- FR-04 Event intelligence and conflict handling
- FR-05 Event detail enhancement and contextual assistance
- FR-06 Event archiving and retrieval
- FR-07 Related event linking and navigation
- FR-08 Camera and brochure/poster recognition
- FR-09 External platform integrations
- FR-10 Collaboration and sharing
- FR-11 Chat history management
- FR-12 Onboarding and preference learning
- FR-13 Analytics and wrapped summaries

## Run locally

```bash
npm install
npm run dev
```

## Validate

```bash
npm run lint
npm run test
npm run build
```
