import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, X, UserPlus, Clock, Trash2, Check, XCircle } from "lucide-react";
import { useGroups, Group, GroupMember } from "@/hooks/useGroups";
import { useAuth } from "@/hooks/useAuth";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";
import EventCreateModal from "@/components/EventCreateModal";
import { useNavigate } from "react-router-dom";

const GroupsPage = () => {
  const { user } = useAuth();
  const { groups, createGroup, deleteGroup, getMembers, inviteMember, respondToInvite } = useGroups();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<GroupMember[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // Load pending invites for current user
  useEffect(() => {
    if (!user) return;
    // Find pending invites across all member lists
    const loadPending = async () => {
      const allPending: GroupMember[] = [];
      for (const g of groups) {
        const m = await getMembers(g.id);
        const myPending = m.filter(
          mem => mem.user_id === user.id && mem.status === "pending"
        );
        allPending.push(...myPending);
      }
      setPendingInvites(allPending);
    };
    loadPending();
  }, [groups, user]);

  const loadMembers = async (group: Group) => {
    setSelectedGroup(group);
    const m = await getMembers(group.id);
    setMembers(m);
  };

  const handleCreate = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    await createGroup(newGroupName, newGroupDesc);
    setNewGroupName("");
    setNewGroupDesc("");
    setShowCreate(false);
    toast.success("Group created!");
  };

  const handleInvite = async () => {
    if (!selectedGroup) return;
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(inviteEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    try {
      await inviteMember(selectedGroup.id, inviteEmail);
      setInviteEmail("");
      const m = await getMembers(selectedGroup.id);
      setMembers(m);
    } catch {}
  };

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      <div className="bg-card border-b border-border px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Groups</h1>
            <p className="text-xs text-muted-foreground">Collaborate and schedule together</p>
          </div>
          <button onClick={() => setShowCreateEvent(true)} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium active:scale-95">
            Create Event
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Pending Invites</h2>
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
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
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
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border p-5 space-y-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
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
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setSelectedGroup(null)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border p-5 space-y-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-foreground">{selectedGroup.name}</h3>
                <button onClick={() => setSelectedGroup(null)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Members */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Members ({members.length})</h4>
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-secondary rounded-xl px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="flex-1 text-sm text-foreground">{m.user_id === user?.id ? "You" : m.user_id.slice(0, 8)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      m.status === "accepted" ? "bg-success/10 text-success" :
                      m.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                    }`}>{m.status}</span>
                    <span className="text-xs text-muted-foreground">{m.role}</span>
                  </div>
                ))}
              </div>

              {/* Invite */}
              {selectedGroup.created_by === user?.id && (
                <div className="flex gap-2">
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Invite by email"
                    className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <button onClick={handleInvite}
                    className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground active:scale-95">
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Find common time */}
              <button
                onClick={() => navigate(`/chat?event=Find a common meeting time for the group "${selectedGroup.name}"`)}
                className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                <Clock className="w-4 h-4" /> Find Common Time with AI
              </button>
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

      <EventCreateModal
        open={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        title="Create Group Event"
      />
    </div>
  );
};

export default GroupsPage;
