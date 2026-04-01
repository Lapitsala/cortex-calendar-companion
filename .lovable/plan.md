
## Plan: Cortex Feature Expansion

### Phase 1: Authentication (prerequisite for everything else)
- Create `profiles` table with display_name, avatar_url, email
- Auto-create profile on signup via trigger
- Build Login/Signup pages with email/password
- Add auth guard to routes
- Update existing tables (calendar_events, chat_sessions, chat_messages) to include `user_id` column

### Phase 2: Week View UX Improvement
- Redesign WeekView component with a timeline header + bottom detail panel
- Panel shows all events for selected day with smooth animations
- Auto-select today on load, tap any day to update panel dynamically
- No need to switch to Day view for event details

### Phase 3: Chat History Cleanup
- Only persist sessions with ≥1 message
- Auto-delete empty sessions when user navigates away
- Add cleanup logic in useChatSessions hook

### Phase 4: Group Collaboration
- Create tables: `groups`, `group_members`, `group_availability`
- Build group creation/management UI
- "Find common time" feature using availability aggregation
- Group event creation with invitations
- Privacy: only expose busy/free blocks, never event details

### Phase 5: Shared Calendar
- Create `calendar_shares` table with sharing levels (availability_only, limited, full)
- Share/accept/revoke UI
- "Shared with me" and "Shared by me" sections in Settings or dedicated page
- Respect sharing level when displaying shared events

### Database Migration (single migration):
- profiles, groups, group_members, group_availability, calendar_shares tables
- Add user_id to calendar_events, chat_sessions, chat_messages
- RLS policies for all tables
- Trigger for auto-creating profiles

### Notes:
- All phases depend on Phase 1 (auth)
- Groups and Shared Calendar are the most complex features
