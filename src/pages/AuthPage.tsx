import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, User, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type View = "login" | "signup" | "forgot";

const AuthPage = () => {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (view === "signup") {
        const { requiresEmailVerification } = await signUp(email, password, displayName || undefined);
        if (requiresEmailVerification) {
          toast.success("Account created! Please check your email to verify your account.");
        } else {
          toast.success("Account created! You're signed in.");
        }
      } else {
        await signIn(email, password);
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent! Check your email.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cortex</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {view === "forgot" ? "Reset your password" : "Your AI Calendar Assistant"}
          </p>
        </div>

        {view === "forgot" ? (
          /* Forgot Password Form */
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <p className="text-sm text-muted-foreground text-center mb-2">
              Enter your email and we'll send you a link to reset your password.
            </p>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 glow-primary"
            >
              {loading ? "Sending..." : "Send Reset Link"}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("login")}
              className="w-full text-center text-sm text-muted-foreground py-2 hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </form>
        ) : (
          /* Login / Signup Form */
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              {view === "signup" && (
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {view === "login" && (
                <button
                  type="button"
                  onClick={() => setView("forgot")}
                  className="text-xs text-primary hover:underline w-full text-right"
                >
                  Forgot password?
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 glow-primary"
              >
                {loading ? "Please wait..." : view === "signup" ? "Create Account" : "Sign In"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <button
              onClick={() => setView(view === "signup" ? "login" : "signup")}
              className="w-full text-center text-sm text-muted-foreground mt-4 py-2 hover:text-foreground transition-colors"
            >
              {view === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage;
