import { motion } from "framer-motion";
import { Clock, Shield, Bell, Calendar, ChevronRight, User, Palette } from "lucide-react";

const sections = [
  {
    title: "Schedule",
    items: [
      { icon: Clock, label: "Working Hours", value: "9 AM – 6 PM" },
      { icon: Calendar, label: "Deadline Buffer", value: "2 days" },
    ],
  },
  {
    title: "Notifications",
    items: [
      { icon: Bell, label: "Event Reminders", value: "15 min before" },
      { icon: Bell, label: "Daily Summary", value: "8:00 AM" },
    ],
  },
  {
    title: "Privacy & Integrations",
    items: [
      { icon: Shield, label: "Privacy Settings", value: "Strict" },
      { icon: Calendar, label: "Google Calendar", value: "Connected" },
      { icon: Calendar, label: "Apple Calendar", value: "Not connected" },
    ],
  },
  {
    title: "Appearance",
    items: [
      { icon: Palette, label: "Theme", value: "Dark" },
      { icon: User, label: "Account", value: "" },
    ],
  },
];

const SettingsPage = () => (
  <div className="flex flex-col h-[100dvh] pb-20">
    <div className="glass-strong px-4 py-3 z-10">
      <h1 className="font-display text-lg font-bold text-foreground">Settings</h1>
      <p className="text-xs text-muted-foreground">Customize your experience</p>
    </div>

    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      {sections.map((section, si) => (
        <motion.div key={section.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{section.title}</h2>
          <div className="glass rounded-xl overflow-hidden divide-y divide-border/50">
            {section.items.map((item) => (
              <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-sm text-foreground text-left">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.value}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

export default SettingsPage;
