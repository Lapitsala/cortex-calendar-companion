import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Users, X, UserPlus, Clock, Trash2, Check, XCircle, LogOut,
  Shield, ShieldCheck, Pencil, UserMinus, CalendarPlus, HelpCircle,
  MapPin, ChevronDown, ChevronUp,
} from "lucide-react";
import { useGroups, Group, GroupMember } from "@/hooks/useGroups";
import { useGroupEvents, GroupEvent, GroupEventResponse } from "@/hooks/useGroupEvents";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/LanguageProvider";

const GroupsPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const {
    groups, createGroup, deleteGroup, updateGroup,
    getMembers, inviteMember, respondToInvite,
    leaveGroup, kickMember, requestAdmin, refetch,
  } = useGroups();
  const {
    groupEvents, eventResponses, fetchGroupEvents, fetchEventResponses,
    createGroupEvent, respondToEvent, deleteGroupEvent,
  } = useGroupEvents();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<GroupMember[]>([]);
  const [pendingGroupIds, setPendingGroupIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [kickTarget, setKickTarget] = useState<GroupMember | null>(null);

  // Group event creation
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "", description: "",
    event_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    start_time: "", end_time: "", location: "",
  });
  const [savingEvent, setSavingEvent] = useState(false);

  // Event detail
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [eventResponsesMap, setEventResponsesMap] = useState<Record<string, GroupEventResponse[]>>({});

  // Notification badges: count of unresponded events per group
  const [unrespondedCounts, setUnrespondedCounts] = useState<Record<string, number>>({});

  const fetchUnrespondedCounts = useCallback(async () => {
    if (!user || groups.length === 0) return;
    const counts: Record<string, number> = {};
    for (const g of groups) {
      const { data: events } = await supabase
        .from("group_events")
        .select("id")
        .eq("group_id", g.id);
      if (!events || events.length === 0) { counts[g.id] = 0; continue; }
      const eventIds = events.map(e => e.id);
      const { data: myResponses } = await supabase
        .from("group_event_responses")
        .select("group_event_id")
        .eq("user_id", user.id)
        .in("group_event_id", eventIds);
      const respondedIds = new Set((myResponses || []).map(r => r.group_event_id));
      counts[g.id] = eventIds.filter(id => !respondedIds.has(id)).length;
    }
    setUnrespondedCounts(counts);
  }, [user, groups]);

  useEffect(() => {
    if (!user) return;
    const loadPending = async () => {
      const allPending: GroupMember[] = [];
      for (const g of groups) {
        const m = await getMembers(g.id);
        const myPending = m.filter(mem => mem.user_id === user.id && mem.status === "pending");
        allPending.push(...myPending);
      }
      setPendingInvites(allPending);
      setPendingGroupIds(new Set(allPending.map(p => p.group_id)));
    };
    loadPending();
  }, [groups, user]);

  useEffect(() => {
    fetchUnrespondedCounts();
  }, [fetchUnrespondedCounts]);

  // Load events when group selected
  useEffect(() => {
    if (selectedGroup) {
      fetchGroupEvents(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadMembers = async (group: Group) => {
    setSelectedGroup(group);
    setEditing(false);
    setExpandedEvent(null);
    const m = await getMembers(group.id);
    setMembers(m);
  };

  const handleCreate = async () => {
    if (!newGroupName.trim()) { toast.error("Group name is required"); return; }
    await createGroup(newGroupName, newGroupDesc);
    setNewGroupName(""); setNewGroupDesc(""); setShowCreate(false);
    toast.success("Group created!");
  };

  const handleInvite = async () => {
    if (!selectedGroup) return;
    if (!inviteEmail.trim()) { toast.error("Please enter an email address"); return; }
    if (!/\S+@\S+\.\S+/.test(inviteEmail.trim())) { toast.error("Please enter a valid email address"); return; }
    try {
      await inviteMember(selectedGroup.id, inviteEmail);
      setInviteEmail("");
      const m = await getMembers(selectedGroup.id);
      setMembers(m);
    } catch {}
  };

  const handleLeave = async () => {
    if (!selectedGroup) return;
    await leaveGroup(selectedGroup.id);
    setSelectedGroup(null);
    await refetch();
  };

  const handleKick = async () => {
    if (!kickTarget) return;
    await kickMember(kickTarget.id);
    setKickTarget(null);
    if (selectedGroup) {
      const m = await getMembers(selectedGroup.id);
      setMembers(m);
    }
  };

  const handleRequestAdmin = async (member: GroupMember) => {
    await requestAdmin(member.id);
    if (selectedGroup) {
      const m = await getMembers(selectedGroup.id);
      setMembers(m);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedGroup || !editName.trim()) return;
    await updateGroup(selectedGroup.id, editName, editDesc || null);
    setEditing(false);
    setSelectedGroup({ ...selectedGroup, name: editName, description: editDesc || null });
    await refetch();
  };

  const startEdit = () => {
    if (!selectedGroup) return;
    setEditName(selectedGroup.name);
    setEditDesc(selectedGroup.description || "");
    setEditing(true);
  };

  const handleCreateGroupEvent = async () => {
    if (!selectedGroup || !eventForm.title.trim() || !eventForm.event_date || !eventForm.start_time) {
      toast.error("Title, date, and start time are required");
      return;
    }
    const endDate = eventForm.end_date && eventForm.end_date >= eventForm.event_date
      ? eventForm.end_date
      : eventForm.event_date;
    if (eventForm.end_time && eventForm.end_date === eventForm.event_date && eventForm.end_time <= eventForm.start_time) {
      toast.error("End time must be after start time");
      return;
    }
    setSavingEvent(true);
    try {
      // Create one event per day in the date range (inclusive)
      const dates: string[] = [];
      const cur = new Date(eventForm.event_date + "T00:00:00");
      const last = new Date(endDate + "T00:00:00");
      while (cur <= last) {
        dates.push(cur.toISOString().split("T")[0]);
        cur.setDate(cur.getDate() + 1);
      }
      for (const d of dates) {
        await createGroupEvent(selectedGroup.id, {
          title: eventForm.title,
          description: eventForm.description || undefined,
          event_date: d,
          start_time: eventForm.start_time,
          end_time: eventForm.end_time || undefined,
          location: eventForm.location || undefined,
        });
      }
      const today = new Date().toISOString().split("T")[0];
      setEventForm({ title: "", description: "", event_date: today, end_date: today, start_time: "", end_time: "", location: "" });
      setShowCreateEvent(false);
      await fetchGroupEvents(selectedGroup.id);
    } catch {} finally {
      setSavingEvent(false);
    }
  };

  const toggleEventDetail = async (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
      return;
    }
    setExpandedEvent(eventId);
    const responses = await fetchEventResponses(eventId);
    setEventResponsesMap(prev => ({ ...prev, [eventId]: responses }));
  };

  const handleRespond = async (eventId: string, response: "accepted" | "declined" | "maybe") => {
    await respondToEvent(eventId, response);
    const responses = await fetchEventResponses(eventId);
    setEventResponsesMap(prev => ({ ...prev, [eventId]: responses }));
    fetchUnrespondedCounts();
  };

  const myMembership = members.find(m => m.user_id === user?.id);
  const isAdmin = myMembership?.role === "admin" || selectedGroup?.created_by === user?.id;

  const getMemberName = (m: GroupMember) => {
    if (m.user_id === user?.id) return "You";
    return m.display_name || m.email || m.user_id.slice(0, 8);
  };

  const getResponseLabel = (r: string) => {
    if (r === "accepted") return t("groups.respond.accept");
    if (r === "declined") return t("groups.respond.decline");
    return t("groups.respond.maybe");
  };

  const getResponseColor = (r: string) => {
    if (r === "accepted") return "bg-success/10 text-success";
    if (r === "declined") return "bg-destructive/10 text-destructive";
    return "bg-warning/10 text-warning";
  };

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      <div className="bg-card border-b border-border px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">{t("groups.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("groups.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{t("groups.pendingInvites")}</h2>
            {pendingInvites.map(inv => {
              const group = groups.find(g => g.id === inv.group_id);
              return (
                <div key={inv.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="flex-1 text-sm text-foreground">{group?.name || "Group"}</span>
                  <button onClick={() => respondToInvite(inv.id, true)} className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center active:scale-95">
                    <Check className="w-4 h-4 text-success" />
                  </button>
                  <button onClick={() => respondToInvite(inv.id, false)} className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center active:scale-95">
                    <XCircle className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Groups list */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Your Groups</h2>
          {groups.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No groups yet. Create one to get started!</p>
          )}
          {groups.map(group => (
            <motion.button
              key={group.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => loadMembers(group)}
              className="w-full text-left bg-card border border-border rounded-xl p-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center relative">
                  <Users className="w-5 h-5 text-primary" />
                  {(unrespondedCounts[group.id] || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                      {unrespondedCounts[group.id]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                  {group.description && <p className="text-xs text-muted-foreground truncate">{group.description}</p>}
                </div>
                {group.created_by === user?.id && (
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(group.id); }}
                    className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-soft glow-primary z-20 active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Create group modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 bottom-16 bg-foreground/30 backdrop-blur-sm z-[60] flex items-end justify-center" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border p-5 space-y-4 max-h-full overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-foreground">New Group</h3>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="flex gap-2">
                <button onClick={() => { setShowCreate(false); setNewGroupName(""); setNewGroupDesc(""); }} className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-medium text-sm active:scale-[0.98] transition-transform">
                  Cancel
                </button>
                <button onClick={handleCreate} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-[0.98] transition-transform">
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group detail modal */}
      <AnimatePresence>
        {selectedGroup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 bottom-16 bg-foreground/30 backdrop-blur-sm z-[60] flex items-end justify-center" onClick={() => setSelectedGroup(null)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border p-5 space-y-4 max-h-[85vh] overflow-y-auto">

              {/* Header */}
              <div className="flex items-center justify-between">
                {editing ? (
                  <div className="flex-1 space-y-2 mr-3">
                    <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Group name"
                      className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description (optional)"
                      className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium">Cancel</button>
                      <button onClick={handleSaveEdit} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="font-display text-base font-bold text-foreground truncate">{selectedGroup.name}</h3>
                    {isAdmin && (
                      <button onClick={startEdit} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center active:scale-95 shrink-0">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )}
                <button onClick={() => setSelectedGroup(null)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95 shrink-0">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {selectedGroup.description && !editing && (
                <p className="text-xs text-muted-foreground">{selectedGroup.description}</p>
              )}

              {/* Group Events */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Group Events</h4>
                  <button
                    onClick={() => setShowCreateEvent(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-medium active:scale-95"
                  >
                    <CalendarPlus className="w-3 h-3" /> New Event
                  </button>
                </div>

                {groupEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No events yet</p>
                )}

                {groupEvents.map(ev => {
                  const isExpanded = expandedEvent === ev.id;
                  const responses = eventResponsesMap[ev.id] || [];
                  const myResponse = responses.find(r => r.user_id === user?.id);
                  const accepted = responses.filter(r => r.response === "accepted");
                  const declined = responses.filter(r => r.response === "declined");
                  const maybe = responses.filter(r => r.response === "maybe");

                  return (
                    <div key={ev.id} className="bg-secondary/50 border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleEventDetail(ev.id)}
                        className="w-full text-left p-3 flex items-start gap-3"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <CalendarPlus className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-semibold text-foreground truncate">{ev.title}</h5>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span>{ev.event_date}</span>
                            <span>{ev.start_time}{ev.end_time ? ` - ${ev.end_time}` : ""}</span>
                          </div>
                          {ev.location && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" /> {ev.location}
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">by {ev.creator_name}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {myResponse && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getResponseColor(myResponse.response)}`}>
                              {getResponseLabel(myResponse.response)}
                            </span>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                              {ev.description && (
                                <p className="text-xs text-muted-foreground">{ev.description}</p>
                              )}

                              {/* Response buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRespond(ev.id, "accepted")}
                                  className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-all ${
                                    myResponse?.response === "accepted" ? "bg-success text-white" : "bg-success/10 text-success"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" /> {t("groups.respond.accept")}
                                </button>
                                <button
                                  onClick={() => handleRespond(ev.id, "declined")}
                                  className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-all ${
                                    myResponse?.response === "declined" ? "bg-destructive text-white" : "bg-destructive/10 text-destructive"
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> {t("groups.respond.decline")}
                                </button>
                                <button
                                  onClick={() => handleRespond(ev.id, "maybe")}
                                  className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-all ${
                                    myResponse?.response === "maybe" ? "bg-warning text-white" : "bg-warning/10 text-warning"
                                  }`}
                                >
                                  <HelpCircle className="w-3.5 h-3.5" /> {t("groups.respond.maybe")}
                                </button>
                              </div>

                              {/* Response status */}
                              {responses.length > 0 && (
                                <div className="space-y-1.5">
                                  <h6 className="text-[11px] font-semibold text-muted-foreground">{t("groups.responseStatus", { n: responses.length })}</h6>
                                  {accepted.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {accepted.map(r => (
                                        <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success">
                                          ✓ {r.user_id === user?.id ? "You" : r.display_name || r.email || r.user_id.slice(0, 6)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {declined.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {declined.map(r => (
                                        <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                          ✗ {r.user_id === user?.id ? "You" : r.display_name || r.email || r.user_id.slice(0, 6)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {maybe.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {maybe.map(r => (
                                        <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                                          ? {r.user_id === user?.id ? "You" : r.display_name || r.email || r.user_id.slice(0, 6)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Delete event (creator only) */}
                              {ev.created_by === user?.id && (
                                <button
                                  onClick={async () => {
                                    await deleteGroupEvent(ev.id);
                                    if (selectedGroup) fetchGroupEvents(selectedGroup.id);
                                  }}
                                  className="w-full py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-medium flex items-center justify-center gap-1 active:scale-95"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete Event
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Members */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Members ({members.filter(m => m.status === "accepted").length})</h4>
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-secondary rounded-xl px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(getMemberName(m))[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground block truncate">{getMemberName(m)}</span>
                      {m.email && m.user_id !== user?.id && (
                        <span className="text-[10px] text-muted-foreground truncate block">{m.email}</span>
                      )}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      m.status === "accepted" ? "bg-success/10 text-success" :
                      m.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                    }`}>{m.status}</span>
                    {m.role === "admin" ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                    {isAdmin && m.user_id !== user?.id && m.status === "accepted" && (
                      <button onClick={() => setKickTarget(m)} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center active:scale-95 shrink-0">
                        <UserMinus className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Invite */}
              {isAdmin && (
                <div className="flex gap-2">
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Invite by email"
                    className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <button onClick={handleInvite}
                    className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground active:scale-95">
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                {myMembership && myMembership.role !== "admin" && myMembership.status === "accepted" && (
                  <button
                    onClick={() => handleRequestAdmin(myMembership)}
                    className="w-full py-2.5 rounded-xl bg-primary/10 text-primary font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <ShieldCheck className="w-4 h-4" /> Request Admin Role
                  </button>
                )}

                <button
                  onClick={() => navigate(`/chat?event=Find a common meeting time for the group "${selectedGroup.name}"`)}
                  className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Clock className="w-4 h-4" /> Find Common Time with AI
                </button>

                {myMembership && selectedGroup.created_by !== user?.id && (
                  <button
                    onClick={handleLeave}
                    className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <LogOut className="w-4 h-4" /> Leave Group
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create group event modal */}
      <AnimatePresence>
        {showCreateEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 bottom-16 bg-foreground/30 backdrop-blur-sm z-[70] flex items-end justify-center"
            onClick={() => setShowCreateEvent(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border p-5 space-y-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-foreground">New Group Event</h3>
                <button onClick={() => setShowCreateEvent(false)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground px-1">Title *</label>
                <input value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} placeholder="Event title"
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground px-1">Description</label>
                <input value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional"
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground px-1">Start date *</label>
                  <input type="date" value={eventForm.event_date} onChange={e => setEventForm(p => ({ ...p, event_date: e.target.value, end_date: p.end_date < e.target.value ? e.target.value : p.end_date }))}
                    className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground px-1">End date</label>
                  <input type="date" value={eventForm.end_date} min={eventForm.event_date} onChange={e => setEventForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground px-1">Start time *</label>
                  <input type="time" value={eventForm.start_time} onChange={e => setEventForm(p => ({ ...p, start_time: e.target.value }))}
                    className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground px-1">End time</label>
                  <input type="time" value={eventForm.end_time} onChange={e => setEventForm(p => ({ ...p, end_time: e.target.value }))}
                    className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground px-1">Location</label>
                <input value={eventForm.location} onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))} placeholder="Optional"
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setShowCreateEvent(false)} className="py-3 rounded-xl bg-secondary text-foreground font-medium text-sm active:scale-[0.98]">
                  Cancel
                </button>
                <button onClick={handleCreateGroupEvent} disabled={savingEvent || !eventForm.title.trim() || !eventForm.start_time}
                  className="py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-[0.98] disabled:opacity-50">
                  {savingEvent ? "Saving..." : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete Group"
        message="Are you sure? All members will lose access."
        onConfirm={async () => { if (deleteTarget) { await deleteGroup(deleteTarget); setDeleteTarget(null); toast.success("Group deleted"); } }}
        onCancel={() => setDeleteTarget(null)}
      />

      <DeleteConfirmDialog
        open={!!kickTarget}
        title="Remove Member"
        message={`Remove ${kickTarget ? getMemberName(kickTarget) : ""} from this group?`}
        onConfirm={handleKick}
        onCancel={() => setKickTarget(null)}
      />
    </div>
  );
};

export default GroupsPage;
