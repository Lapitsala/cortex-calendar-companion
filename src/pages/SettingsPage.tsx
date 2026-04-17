import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Bell, Calendar, ChevronRight, User, X, Check, LogOut, Download, BarChart3, Moon, Sun, Pencil, Trash2, FileSpreadsheet, Languages } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import CalendarImportModal from "@/components/CalendarImportModal";
import ClassroomImportModal from "@/components/ClassroomImportModal";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { Input } from "@/components/ui/input";
import { useClassroomData } from "@/hooks/useClassroomData";
import { useTranslation } from "@/i18n/LanguageProvider";
import { TranslationKey } from "@/i18n/translations";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, signOut, isPreviewMode } = useAuth();
  const { t, language, setLanguage } = useTranslation();

  // Build i18n-aware sections
  const sections: { titleKey: TranslationKey; items: { icon: typeof Clock; labelKey: TranslationKey; value: string; options?: string[] }[] }[] = [
    {
      titleKey: "settings.schedule",
      items: [
        { icon: Clock, labelKey: "settings.workingHours", value: "9 AM – 6 PM", options: ["8 AM – 4 PM", "9 AM – 5 PM", "9 AM – 6 PM", "10 AM – 7 PM"] },
        { icon: Calendar, labelKey: "settings.deadlineBuffer", value: t("settings.days", { n: 2 }), options: [t("settings.day", { n: 1 }), t("settings.days", { n: 2 }), t("settings.days", { n: 3 }), t("settings.days", { n: 5 })] },
      ],
    },
    {
      titleKey: "settings.notifications",
      items: [
        { icon: Bell, labelKey: "settings.eventReminders", value: t("settings.minBefore", { n: 15 }), options: [t("settings.minBefore", { n: 5 }), t("settings.minBefore", { n: 10 }), t("settings.minBefore", { n: 15 }), t("settings.minBefore", { n: 30 }), t("settings.hourBefore", { n: 1 })] },
        { icon: Bell, labelKey: "settings.dailySummary", value: "8:00 AM", options: ["7:00 AM", "8:00 AM", "9:00 AM", t("settings.off")] },
      ],
    },
  ];

  const [settings, setSettings] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    sections.forEach(s => s.items.forEach(i => { map[i.labelKey] = i.value; }));
    return map;
  });
  const [showImport, setShowImport] = useState(false);
  const [activeSheet, setActiveSheet] = useState<{ labelKey: TranslationKey; options: string[] } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClassroomImport, setShowClassroomImport] = useState(false);
  const [showLangSheet, setShowLangSheet] = useState(false);
  const classroomData = useClassroomData();

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("display_name").eq("user_id", user.id).single()
        .then(({ data }) => {
          if (data?.display_name) setDisplayName(data.display_name);
        });
    }
  }, [user]);

  const handleSelect = (labelKey: TranslationKey, value: string) => {
    setSettings(prev => ({ ...prev, [labelKey]: value }));
    setActiveSheet(null);
    toast.success(t("settings.setTo", { label: t(labelKey), value }));
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success(t("settings.signedOut"));
  };

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    toast.success(next ? t("settings.darkOn") : t("settings.darkOff"));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error(t("settings.profileUpdateFailed"));
    } else {
      toast.success(t("settings.profileUpdated"));
      setEditingProfile(false);
    }
  };

  const handleClearAllData = async () => {
    if (!user) return;
    setClearing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error(t("settings.sessionExpired")); return; }

      await Promise.all([
        supabase.from("calendar_events").delete().eq("user_id", user.id),
        supabase.from("want_to_do").delete().eq("user_id", user.id),
        supabase.from("chat_messages").delete().in(
          "session_id",
          (await supabase.from("chat_sessions").select("id").eq("user_id", user.id)).data?.map(s => s.id) || []
        ),
      ]);
      await supabase.from("chat_sessions").delete().eq("user_id", user.id);

      await classroomData.clearAll();

      toast.success(t("settings.clearAllSuccess"));
      setShowClearConfirm(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error(t("settings.clearAllFailed"));
    } finally {
      setClearing(false);
    }
  };

  const handleLangChange = (lang: "en" | "th") => {
    setLanguage(lang);
    setShowLangSheet(false);
    toast.success(t("settings.languageChanged"));
  };

  return (
    <div className="flex flex-col h-[100dvh] pb-20 bg-background">
      <div className="bg-card border-b border-border px-4 py-3 z-10">
        <h1 className="font-display text-lg font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-xs text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Account info */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName || user?.email || t("settings.previewUser")}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || "preview@example.com"}</p>
              <p className="text-[10px] text-muted-foreground">{isPreviewMode ? t("settings.previewMode") : t("settings.signedIn")}</p>
            </div>
            {!isPreviewMode && (
              <button onClick={() => setEditingProfile(!editingProfile)} aria-label={t("settings.editProfile")} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <AnimatePresence>
            {editingProfile && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 space-y-2">
                  <label className="text-xs text-muted-foreground">{t("settings.displayName")}</label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t("settings.displayNamePlaceholder")} />
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {savingProfile ? t("common.saving") : t("common.save")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Language */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{t("settings.language")}</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowLangSheet(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors active:bg-secondary"
            >
              <Languages className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground text-left">{t("settings.language")}</span>
              <span className="text-xs text-muted-foreground">{language === "en" ? t("settings.languageEnglish") : t("settings.languageThai")}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Import */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{t("settings.import")}</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => setShowImport(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors active:bg-secondary"
            >
              <Download className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground text-left">{t("settings.importIcs")}</span>
              <span className="text-xs text-muted-foreground">{t("settings.importIcsHint")}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowClassroomImport(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors active:bg-secondary"
            >
              <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground text-left">{t("settings.importClassroom")}</span>
              <span className="text-xs text-muted-foreground">{t("settings.importClassroomHint")}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Insights */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{t("settings.analytics")}</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => navigate("/insights")}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors active:bg-secondary"
            >
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground text-left">{t("settings.insights")}</span>
              <span className="text-xs text-muted-foreground">{t("settings.view")}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Dark Mode */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{t("settings.appearance")}</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors active:bg-secondary"
            >
              {isDark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
              <span className="flex-1 text-sm text-foreground text-left">{t("settings.darkMode")}</span>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${isDark ? "bg-primary" : "bg-input"}`}>
                <motion.div layout className={`w-5 h-5 rounded-full bg-background shadow-sm`} style={{ marginLeft: isDark ? "auto" : 0 }} />
              </div>
            </button>
          </div>
        </motion.div>

        {sections.map((section, si) => (
          <motion.div key={section.titleKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 + si * 0.08 }}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{t(section.titleKey)}</h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              {section.items.map((item) => (
                <button
                  key={item.labelKey}
                  onClick={() => item.options && item.options.length > 0 && setActiveSheet({ labelKey: item.labelKey, options: item.options })}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors active:bg-secondary"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground text-left">{t(item.labelKey)}</span>
                  <span className="text-xs text-muted-foreground">{settings[item.labelKey]}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {!isPreviewMode && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Trash2 className="w-4 h-4" /> {t("settings.clearAll")}
          </button>
        )}

        {!isPreviewMode && (
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl bg-secondary text-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <LogOut className="w-4 h-4" /> {t("settings.signOut")}
          </button>
        )}
      </div>

      {/* Language sheet */}
      <AnimatePresence>
        {showLangSheet && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 bottom-16 bg-foreground/30 backdrop-blur-sm z-[60] flex items-end justify-center"
            onClick={() => setShowLangSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold text-foreground">{t("settings.language")}</h3>
                <button onClick={() => setShowLangSheet(false)} aria-label={t("common.close")} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-1">
                {(["en", "th"] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleLangChange(lang)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors active:scale-[0.98] ${
                      language === lang ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {lang === "en" ? t("settings.languageEnglish") : t("settings.languageThai")}
                    {language === lang && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options sheet */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 bottom-16 bg-foreground/30 backdrop-blur-sm z-[60] flex items-end justify-center"
            onClick={() => setActiveSheet(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-full overflow-y-auto bg-card rounded-t-2xl border-t border-border p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold text-foreground">{t(activeSheet.labelKey)}</h3>
                <button onClick={() => setActiveSheet(null)} aria-label={t("common.close")} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-1">
                {activeSheet.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(activeSheet.labelKey, opt)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors active:scale-[0.98] ${
                      settings[activeSheet.labelKey] === opt
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {opt}
                    {settings[activeSheet.labelKey] === opt && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CalendarImportModal open={showImport} onClose={() => setShowImport(false)} />
      <ClassroomImportModal
        open={showClassroomImport}
        onClose={() => setShowClassroomImport(false)}
        onImport={(courses, assignments) => classroomData.importData(courses, assignments)}
      />
      <DeleteConfirmDialog
        open={showClearConfirm}
        title={t("settings.clearAllConfirmTitle")}
        message={t("settings.clearAllConfirmMessage")}
        onConfirm={handleClearAllData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

export default SettingsPage;
