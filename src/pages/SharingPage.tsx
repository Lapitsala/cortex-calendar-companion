import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X, Check, XCircle, Trash2, Eye, EyeOff, ChevronRight } from "lucide-react";
import { useCalendarShares, ShareLevel } from "@/hooks/useCalendarShares";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";
import EventCreateModal from "@/components/EventCreateModal";

const shareLevelLabels: Record<ShareLevel, { label: string; desc: string; icon: typeof Eye }> = {
  availability_only: { label: "Availability Only", desc: "Only see busy/free", icon: EyeOff },
  limited: { label: "Limited Details", desc: "See title + time", icon: Eye },
  full: { label: "Full Access", desc: "See all event details", icon: Eye },
};

const SharingPage = () => {
  const { sharedByMe, sharedWithMe, shareCalendar, respondToShare, revokeShare } = useCalendarShares();
  const [showShare, setShowShare] = useState(false);
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<ShareLevel>("limited");
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const handleShare = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    await shareCalendar(email, level);
    setEmail("");
    setShowShare(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      <div className="bg-card border-b border-border px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Shared Calendars</h1>
            <p className="text-xs text-muted-foreground">Share with loved ones</p>
          </div>
          <button onClick={() => setShowCreateEvent(true)} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium active:scale-95">
            Create Event
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Pending shares */}
        {sharedWithMe.filter(s => s.status === "pending").length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Pending Requests</h2>
            {sharedWithMe.filter(s => s.status === "pending").map(share => (
              <div key={share.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <Share2 className="w-4 h-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{share.owner_name || share.owner_email || "Someone"}</p>
                  <p className="text-xs text-muted-foreground">{shareLevelLabels[share.share_level as ShareLevel]?.desc}</p>
                </div>
                <button onClick={() => respondToShare(share.id, true)} className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center active:scale-95">
                  <Check className="w-4 h-4 text-success" />
                </button>
                <button onClick={() => respondToShare(share.id, false)} className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center active:scale-95">
                  <XCircle className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Shared with me */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Shared With Me</h2>
          {sharedWithMe.filter(s => s.status === "accepted").length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No shared calendars yet</p>
          )}
          {sharedWithMe.filter(s => s.status === "accepted").map(share => (
            <div key={share.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{share.owner_name || share.owner_email || "Calendar"}</p>
                <p className="text-xs text-muted-foreground">{shareLevelLabels[share.share_level as ShareLevel]?.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>

        {/* Shared by me */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Shared By Me</h2>
          {sharedByMe.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">You haven't shared your calendar yet</p>
          )}
          {sharedByMe.map(share => (
            <div key={share.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{share.shared_with_name || share.shared_with_email || "User"}</p>
                <p className="text-xs text-muted-foreground">{shareLevelLabels[share.share_level as ShareLevel]?.desc} • {share.status}</p>
              </div>
              <button onClick={() => setRevokeTarget(share.id)} className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center active:scale-95">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowShare(true)}
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-soft glow-primary z-20 active:scale-95 transition-transform"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {/* Share modal */}
      <AnimatePresence>
        {showShare && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowShare(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-foreground">Share Calendar</h3>
                <button onClick={() => setShowShare(false)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Sharing Level</p>
                {(Object.keys(shareLevelLabels) as ShareLevel[]).map(l => {
                  const IconComp = shareLevelLabels[l].icon;
                  return (
                  <button key={l} onClick={() => setLevel(l)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors active:scale-[0.98] ${
                      level === l ? "bg-primary/10 border border-primary/30" : "bg-secondary"
                    }`}>
                    <IconComp className={`w-4 h-4 ${level === l ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`text-sm font-medium ${level === l ? "text-primary" : "text-foreground"}`}>{shareLevelLabels[l].label}</p>
                      <p className="text-xs text-muted-foreground">{shareLevelLabels[l].desc}</p>
                    </div>
                  </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowShare(false); setEmail(""); }} className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-medium text-sm active:scale-[0.98] transition-transform">
                  Cancel
                </button>
                <button onClick={handleShare} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-[0.98] transition-transform">
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmDialog
        open={!!revokeTarget}
        title="Revoke Access"
        message="Are you sure you want to revoke this person's access to your calendar?"
        onConfirm={async () => { if (revokeTarget) { await revokeShare(revokeTarget); setRevokeTarget(null); } }}
        onCancel={() => setRevokeTarget(null)}
      />

      <EventCreateModal
        open={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        title="Create Shared Event"
      />
    </div>
  );
};

export default SharingPage;
