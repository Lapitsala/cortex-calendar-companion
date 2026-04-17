import { MessageSquare, Calendar, Users, Share2, Settings, BookOpen, ListChecks } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "@/i18n/LanguageProvider";
import { TranslationKey } from "@/i18n/translations";

const tabs: { path: string; icon: typeof Calendar; labelKey: TranslationKey }[] = [
  { path: "/", icon: Calendar, labelKey: "nav.calendar" },
  { path: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { path: "/groups", icon: Users, labelKey: "nav.groups" },
  { path: "/sharing", icon: Share2, labelKey: "nav.sharing" },
  { path: "/want-to-do", icon: ListChecks, labelKey: "nav.wantToDo" },
  { path: "/classroom", icon: BookOpen, labelKey: "nav.classroom" },
  { path: "/settings", icon: Settings, labelKey: "nav.settings" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl transition-colors"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon
                className={`w-5 h-5 relative z-10 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[9px] font-medium relative z-10 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
