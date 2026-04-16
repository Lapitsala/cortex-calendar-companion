import { useState, useCallback } from "react";
import { useCalendarEvents, CalendarEvent } from "@/hooks/useCalendarEvents";
import { findConflicts } from "@/lib/eventConflicts";
import { PendingEvent, ConflictResolution } from "@/components/ConflictResolverDialog";
import { toast } from "sonner";

interface PendingState {
  event: PendingEvent;
  conflicts: CalendarEvent[];
  resolve: (createdId: string | null) => void;
  reject: (err: Error) => void;
}

/**
 * Centralized event-creation flow with conflict detection.
 * Use `attemptCreateEvent` from anywhere — if a conflict exists, the
 * ConflictResolverDialog will be shown and the user's choice applied.
 */
export const useEventConflictCheck = () => {
  const { events, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const [pending, setPending] = useState<PendingState | null>(null);

  /**
   * Try to create an event. Resolves with the new event id (or null if user cancelled creation).
   */
  const attemptCreateEvent = useCallback(
    (event: PendingEvent): Promise<string | null> => {
      return new Promise((resolve, reject) => {
        const conflicts = findConflicts(
          { event_date: event.event_date, start_time: event.start_time, end_time: event.end_time },
          events,
        );

        if (conflicts.length === 0) {
          // No conflict — create directly
          createEvent({
            title: event.title,
            description: event.description ?? null,
            event_date: event.event_date,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            priority: event.priority,
          })
            .then((created) => resolve(created.id))
            .catch(reject);
          return;
        }

        // Show dialog
        setPending({ event, conflicts, resolve, reject });
      });
    },
    [events, createEvent],
  );

  const handleResolve = useCallback(
    async (resolution: ConflictResolution) => {
      if (!pending) return;
      const { event, resolve, reject } = pending;
      try {
        // 1. Delete events the user marked for deletion
        await Promise.all(resolution.toDelete.map((id) => deleteEvent(id)));

        // 2. If user wants to keep the new event, create it
        let createdId: string | null = null;
        if (resolution.createNew) {
          const created = await createEvent({
            title: event.title,
            description: event.description ?? null,
            event_date: event.event_date,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            priority: event.priority,
          });
          createdId = created.id;
        }

        // 3. Inform user with toast about ranking (the rank is saved client-side via
        //    the order they kept; calendar UI will display them stacked)
        const rank = resolution.keepOrder.length;
        if (rank > 0) {
          toast.success(`Saved ${rank} event${rank > 1 ? "s" : ""} (stacked by your priority)`);
        } else if (resolution.toDelete.length > 0) {
          toast.success("Cleared conflicting events");
        }

        setPending(null);
        resolve(createdId);
      } catch (err) {
        setPending(null);
        reject(err as Error);
      }
    },
    [pending, createEvent, deleteEvent, updateEvent],
  );

  const handleCancel = useCallback(() => {
    if (!pending) return;
    pending.resolve(null);
    setPending(null);
  }, [pending]);

  return {
    attemptCreateEvent,
    conflictDialogProps: {
      open: !!pending,
      newEvent: pending?.event ?? null,
      conflictingEvents: pending?.conflicts ?? [],
      onCancel: handleCancel,
      onResolve: handleResolve,
    },
  };
};
