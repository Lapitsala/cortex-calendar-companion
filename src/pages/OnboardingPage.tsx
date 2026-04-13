import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PURPOSE_OPTIONS = [
  { id: "personal", label: "📅 Personal scheduling", desc: "Manage my daily life & appointments" },
  { id: "work", label: "💼 Work & meetings", desc: "Organize professional tasks & meetings" },
  { id: "academic", label: "📚 Academic / School", desc: "Track classes, exams & assignments" },
  { id: "fitness", label: "🏃 Fitness & health", desc: "Plan workouts & health routines" },
  { id: "social", label: "🎉 Social events", desc: "Coordinate hangouts & gatherings" },
  { id: "family", label: "👨‍👩‍👧‍👦 Family coordination", desc: "Keep the family on the same page" },
];

const FEATURE_OPTIONS = [
  { id: "ai_suggest", label: "🤖 AI scheduling suggestions", desc: "Let AI help plan your day" },
  { id: "shared_cal", label: "📤 Shared calendars", desc: "Share & view calendars with others" },
  { id: "todo_list", label: "✅ Want-to-do lists", desc: "Track tasks with deadlines" },
  { id: "groups", label: "👥 Group coordination", desc: "Find common availability in groups" },
  { id: "reminders", label: "🔔 Smart reminders", desc: "Get notified at the right time" },
  { id: "insights", label: "📊 Time insights", desc: "Understand how you spend your time" },
];

const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleSelection = (id: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(id) ? current.filter(i => i !== id) : [...current, id]);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase.from("user_preferences" as any) as any).upsert({
        user_id: user!.id,
        preferences: { purposes, features },
        onboarding_completed: true,
      }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Welcome to Cortex! 🎉");
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      title: "What brings you to Cortex?",
      subtitle: "Select all that apply",
      options: PURPOSE_OPTIONS,
      selected: purposes,
      setter: setPurposes,
    },
    {
      title: "Which features interest you?",
      subtitle: "We'll personalize your experience",
      options: FEATURE_OPTIONS,
      selected: features,
      setter: setFeatures,
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary mb-3">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">{current.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{current.subtitle}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? "w-10 bg-primary" : "w-6 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Options */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 mb-6"
          >
            {current.options.map((opt) => {
              const isSelected = current.selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleSelection(opt.id, current.selected, current.setter)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:bg-secondary/50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary/50 active:scale-[0.98] transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={step < steps.length - 1 ? () => setStep(s => s + 1) : handleFinish}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 glow-primary"
          >
            {saving ? "Saving..." : step < steps.length - 1 ? "Next" : "Get Started"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={handleFinish}
          className="w-full text-center text-xs text-muted-foreground mt-4 py-2 hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
