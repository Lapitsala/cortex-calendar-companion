import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Calendar, MessageCircle, ListTodo, GraduationCap, Users, Share2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";

export type ClearDataKey = "calendar" | "chat" | "wantToDo" | "classroom" | "groups" | "sharing";

export type ClearSelection = Record<ClearDataKey, boolean>;

interface Props {
  open: boolean;
  onConfirm: (selection: ClearSelection) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ClearDataDialog = ({ open, onConfirm, onCancel, loading }: Props) => {
  const { t } = useTranslation();
  const [sel, setSel] = useState<ClearSelection>({
    calendar: true,
    chat: true,
    wantToDo: true,
    classroom: true,
    groups: false,
    sharing: false,
  });

  useEffect(() => {
    if (open) {
      setSel({ calendar: true, chat: true, wantToDo: true, classroom: true, groups: false, sharing: false });
    }
  }, [open]);

  const items: { key: ClearDataKey; icon: typeof Calendar; labelKey: string; hintKey: string }[] = [
    { key: "calendar", icon: Calendar, labelKey: "clearData.calendar", hintKey: "clearData.calendarHint" },
    { key: "chat", icon: MessageCircle, labelKey: "clearData.chat", hintKey: "clearData.chatHint" },
    { key: "wantToDo", icon: ListTodo, labelKey: "clearData.wantToDo", hintKey: "clearData.wantToDoHint" },
    { key: "classroom", icon: GraduationCap, labelKey: "clearData.classroom", hintKey: "clearData.classroomHint" },
    { key: "groups", icon: Users, labelKey: "clearData.groups", hintKey: "clearData.groupsHint" },
    { key: "sharing", icon: Share2, labelKey: "clearData.sharing", hintKey: "clearData.sharingHint" },
  ];

  const noneSelected = !Object.values(sel).some(Boolean);
  const allSelected = Object.values(sel).every(Boolean);

  const toggleAll = () => {
    const next = !allSelected;
    setSel({ calendar: next, chat: next, wantToDo: next, classroom: next, groups: next, sharing: next });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-2xl border border-border p-5 max-w-sm w-full shadow-soft space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">{t("clearData.title")}</h3>
                <p className="text-xs text-muted-foreground">{t("clearData.subtitle")}</p>
              </div>
            </div>

            <button
              onClick={toggleAll}
              className="w-full text-xs text-primary font-medium text-left px-1 active:scale-[0.98] transition-transform"
            >
              {allSelected ? t("clearData.deselectAll") : t("clearData.selectAll")}
            </button>

            <div className="space-y-1">
              {items.map(item => {
                const Icon = item.icon;
                const checked = sel[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSel(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-colors text-left ${
                      checked ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${checked ? "text-destructive" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{t(item.labelKey as never)}</p>
                      <p className="text-xs text-muted-foreground">{t(item.hintKey as never)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => onConfirm(sel)}
                disabled={loading || noneSelected}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {loading ? t("common.loading") : t("clearData.deleteSelected")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClearDataDialog;
