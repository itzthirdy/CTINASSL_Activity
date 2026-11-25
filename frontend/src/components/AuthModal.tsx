import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { animate } from "animejs";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { storeApi } from "../services/api";
import type { AppUser } from "../services/api";

export type AuthModalMode =
  | "login"
  | "register"
  | "forgot-verify"
  | "change-password-dashboard";

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthModalMode;
  promptMessage?: string | null;
  onClose: () => void;
  onAuthSuccess: (user: AppUser) => void;
}

export function AuthModal({
  isOpen,
  initialMode = "login",
  promptMessage,
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<AuthModalMode>(initialMode);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 3-Step OTP Forgot Password states
  const [resetEmail, setResetEmail] = useState("");
  const [verifiedUsername, setVerifiedUsername] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && cardRef.current) {
      animate(cardRef.current, {
        scale: [0.92, 1],
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 400,
        ease: "outBack(1.5)",
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const switchMode = (nextMode: AuthModalMode) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setMode(nextMode);
    if (cardRef.current) {
      animate(cardRef.current, {
        translateY: [10, 0],
        opacity: [0.7, 1],
        duration: 300,
        ease: "outExpo",
      });
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const user = await storeApi.login(username, password);
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await storeApi.register(username, email, password);
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await storeApi.verifyEmailForReset(resetEmail);
      setVerifiedUsername(res.username);
      setDevOtpPreview(res.devOtpPreview ?? null);
      setOtpCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      switchMode("change-password-dashboard");
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "No account found with that email address."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (otpCode.trim().length !== 6) {
      setErrorMsg("Enter the 6-digit OTP verification code.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const updatedUser = await storeApi.resetPasswordByEmail(
        resetEmail,
        otpCode,
        newPassword
      );
      setUsername(updatedUser.username);
      setPassword(newPassword);
      setSuccessMsg(
        `Password reset for @${updatedUser.username}! You can now sign in.`
      );
      setTimeout(() => {
        setMode("login");
      }, 1100);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to update password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCustomer = () => {
    setUsername("thirdy");
    setPassword("sole123");
    setErrorMsg(null);
  };

  const fillDemoAdmin = () => {
    setUsername("admin");
    setPassword("admin123");
    setErrorMsg(null);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#101118] p-7 text-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-zinc-300 transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {promptMessage && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-xs font-medium text-amber-200">
            {promptMessage}
          </div>
        )}

        {(mode === "login" || mode === "register") && (
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-black/50 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`cursor-pointer rounded-xl py-2 text-xs font-bold tracking-wider uppercase transition ${
                mode === "login"
                  ? "bg-white text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`cursor-pointer rounded-xl py-2 text-xs font-bold tracking-wider uppercase transition ${
                mode === "register"
                  ? "bg-white text-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/15 px-3.5 py-2.5 text-xs font-medium text-red-200">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-medium text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode === "login" && (
          <div>
            <span className="font-sport text-xl tracking-wider uppercase italic">
              SOLE PURPOSE <span className="text-amber-300">SIGN IN</span>
            </span>
            <p className="mt-1.5 text-xs text-zinc-400">
              Sign in with your username and password to access your basket,
              liked shoes, and checkout.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={fillDemoCustomer}
                className="flex-1 cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-amber-400/40 hover:text-white"
              >
                Demo Customer (thirdy)
              </button>
              <button
                type="button"
                onClick={fillDemoAdmin}
                className="flex-1 cursor-pointer rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[11px] font-medium text-amber-300 transition hover:bg-amber-400/20"
              >
                Demo Admin (admin)
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Username
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <User className="h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot-verify")}
                    className="cursor-pointer text-xs font-medium text-amber-300 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <Lock className="h-4 w-4 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full cursor-pointer rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 py-3 text-xs font-bold tracking-[0.18em] text-black uppercase transition hover:brightness-110 disabled:opacity-50"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
            </form>
          </div>
        )}

        {mode === "register" && (
          <div>
            <span className="font-sport text-xl tracking-wider uppercase italic">
              CREATE <span className="text-amber-300">MEMBER ACCOUNT</span>
            </span>
            <p className="mt-1.5 text-xs text-zinc-400">
              Register your username, email, and password (min 6 characters).
            </p>

            <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Username
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <User className="h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                    placeholder="Choose a username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Email Address
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Password
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <Lock className="h-4 w-4 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full cursor-pointer rounded-full bg-white py-3 text-xs font-bold tracking-[0.18em] text-black uppercase transition hover:bg-amber-300 disabled:opacity-50"
              >
                {isSubmitting ? "Creating Account..." : "Register Account"}
              </button>
            </form>
          </div>
        )}

        {mode === "forgot-verify" && (
          <div>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </button>

            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-400" />
              <span className="font-sport text-xl tracking-wider uppercase italic">
                FORGOT <span className="text-amber-300">PASSWORD</span>
              </span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">
              Enter your registered email to generate a 6-digit verification OTP.
            </p>

            <form onSubmit={handleVerifyEmailSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Registered Email Address
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                    placeholder="e.g. thirdy@solepurpose.ph"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full cursor-pointer rounded-full bg-amber-400 py-3 text-xs font-bold tracking-[0.18em] text-black uppercase transition hover:bg-amber-300 disabled:opacity-50"
              >
                {isSubmitting ? "Sending OTP..." : "Send 6-Digit OTP"}
              </button>
            </form>
          </div>
        )}

        {mode === "change-password-dashboard" && (
          <div>
            <button
              type="button"
              onClick={() => switchMode("forgot-verify")}
              className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Change Email</span>
            </button>

            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                <span>OTP Verification Active · @{verifiedUsername}</span>
              </div>
              {devOtpPreview && (
                <p className="font-mono-tabular mt-1.5 text-xs text-amber-300">
                  Demo OTP Code: <strong>{devOtpPreview}</strong>
                </p>
              )}
            </div>

            <form
              onSubmit={handleResetPasswordSubmit}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="font-mono-tabular mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-center text-base font-bold tracking-[0.35em] text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  New Password
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Confirm New Password
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full cursor-pointer rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 py-3 text-xs font-bold tracking-[0.18em] text-black uppercase transition hover:brightness-110 disabled:opacity-50"
              >
                {isSubmitting ? "Resetting..." : "Verify OTP & Save Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
