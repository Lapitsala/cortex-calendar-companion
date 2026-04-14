import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Bell, Calendar, ChevronRight, User, X, Check, LogOut, Download, BarChart3, Moon, Sun, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import CalendarImportModal from "@/components/CalendarImportModal";
import { Input } from "@/components/ui/input";

interface SettingItem {
  icon: typeof Clock;
  label: string;
  value: string;
  options?: string[];
}

const sections: { title: string; items: SettingItem[] }[] = [
  {
    title: "Schedule",
    items: [
      { icon: Clock, label: "Working Hours", value: "9 AM – 6 PM", options: ["8 AM – 4 PM", "9 AM – 5 PM", "9 AM – 6 PM", "10 AM – 7 PM"] },
      { icon: Calendar, label: "Deadline Buffer", value: "2 days", options: ["1 day", "2 days", "3 days", "5 days"] },
    ],
  },
  {
    title: "Notifications",
    items: [
      { icon: Bell, label: "Event Reminders", value: "15 min before", options: ["5 min before", "10 min before", "15 min before", "30 min before", "1 hour before"] },
      { icon: Bell, label: "Daily Summary", value: "8:00 AM", options: ["7:00 AM", "8:00 AM", "9:00 AM", "Off"] },
    ],
  },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, signOut, isPreviewMode } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    sections.forEach(s => s.items.forEach(i => { map[i.label] = i.value; }));
    return map;
  });
  const [showImport, setShowImport] = useState(false);
  const [activeSheet, setActiveSheet] = useState<{ label: string; options: string[] } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("display_name").eq("user_id", user.id).single()
        .then(({ data }) => {
          if (data?.display_name) setDisplayName(data.display_name);
        });
    }
  }, [user]);

  const handleSelect = (label: string, value: string) => {
    setSettings(prev => ({ ...prev, [label]: value }));
    setActiveSheet(null);
    toast.success(`${label} set to ${value}`);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    toast.success(next ? "Dark mode enabled" : "Light mode enabled");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated");
      setEditingProfile(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      <div className="bg-card border-b border-border px-4 py-3 z-10">
        <h1 className="font-display text-lg font-bold text-foreground">Settings</h1>
        <p className="text-xs text-muted-foreground">Customize your experience</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Account info */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName || user?.email || "Preview user"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || "preview@example.com"}</p>
              <p className="text-[10px] text-muted-foreground">{isPreviewMode ? "Preview mode" : "Signed in"}</p>
            </div>
            {!isPreviewMode && (
              <button onClick={() => setEditingProfile(!editingProfile)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <AnimatePresence>
            {editingProfile && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 space-y-2">
                  <label className="text-xs text-muted-foreground">Display Name</label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {savingProfile ? "Saving..." : "Save"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Import Calendar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Import</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowImport(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors active:bg-secondary"
            >
              <Download className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground text-left">Import from .ics file</span>
              <span className="text-xs text-muted-foreground">Google / Apple</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Insights & Analytics */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Analytics</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => navigate("/insights")}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors active:bg-secondary"
            >
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground text-left">Insights & Analytics</span>
              <span className="text-xs text-muted-foreground">View</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Dark Mode */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Appearance</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors active:bg-secondary"
            >
              {isDark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
              <span className="flex-1 text-sm text-foreground text-left">Dark Mode</span>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${isDark ? "bg-primary" : "bg-input"}`}>
                <motion.div layout className={`w-5 h-5 rounded-full bg-background shadow-sm`} style={{ marginLeft: isDark ? "auto" : 0 }} />
              </div>
            </button>
          </div>
        </motion.div>

        {sections.map((section, si) => (
          <motion.div key={section.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 + si * 0.08 }}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{section.title}</h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => item.options && item.options.length > 0 && setActiveSheet({ label: item.label, options: item.options })}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors active:bg-secondary"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground text-left">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{settings[item.label]}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Sign out */}
        {!isPreviewMode && (
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        )}
      </div>

      {/* Options sheet */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 bottom-16 bg-foreground/30 backdrop-blur-sm z-[60] flex items-end justify-center"
            onClick={() => setActiveSheet(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-full overflow-y-auto bg-card rounded-t-2xl border-t border-border p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold text-foreground">{activeSheet.label}</h3>
                <button onClick={() => setActiveSheet(null)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-1">
                {activeSheet.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(activeSheet.label, opt)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors active:scale-[0.98] ${
                      settings[activeSheet.label] === opt
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {opt}
                    {settings[activeSheet.label] === opt && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CalendarImportModal open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
};

export default SettingsPage;
