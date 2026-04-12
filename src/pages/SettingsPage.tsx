import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Shield, Bell, Calendar, ChevronRight, User, Palette, X, Check, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

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
  {
    title: "Privacy",
    items: [
      { icon: Shield, label: "Privacy Settings", value: "Strict", options: ["Strict", "Normal", "Relaxed"] },
    ],
  },
  {
    title: "Appearance",
    items: [
      { icon: Palette, label: "Theme", value: "Light", options: ["Light", "Dark", "System"] },
    ],
  },
];

const SettingsPage = () => {
  const { user, signOut, isPreviewMode } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    sections.forEach(s => s.items.forEach(i => { map[i.label] = i.value; }));
    return map;
  });
  const [activeSheet, setActiveSheet] = useState<{ label: string; options: string[] } | null>(null);

  const handleSelect = (label: string, value: string) => {
    setSettings(prev => ({ ...prev, [label]: value }));
    setActiveSheet(null);
    toast.success(`${label} set to ${value}`);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      <div className="bg-card border-b border-border px-4 py-3 z-10">
        <h1 className="font-display text-lg font-bold text-foreground">Settings</h1>
        <p className="text-xs text-muted-foreground">Customize your experience</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Account info */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.email || "Preview user"}</p>
            <p className="text-xs text-muted-foreground">{isPreviewMode ? "Preview mode (no backend credentials)" : "Signed in"}</p>
          </div>
        </div>

        {sections.map((section, si) => (
          <motion.div key={section.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}>
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
        {!isPreviewMode && (<button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>)}
      </div>

      {/* Options sheet */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-end justify-center pb-24"
            onClick={() => setActiveSheet(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[calc(100vh-7rem)] overflow-y-auto bg-card rounded-t-2xl border-t border-border p-5"
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
    </div>
  );
};

export default SettingsPage;
