import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { animate } from "animejs";
import { Lock, Mail, User, X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (name: string) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: AuthModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("athlete@solepurpose.ph");
  const [password, setPassword] = useState("••••••••••••");
  const [displayName, setDisplayName] = useState("Thirdy");

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onLoginSuccess(displayName.trim() || "Athlete");
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#101118] p-7 text-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-zinc-300 transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center">
          <span className="font-sport text-xl tracking-wider uppercase italic">
            SOLE PURPOSE{" "}
            <span className="text-amber-300">MEMBER LOGIN</span>
          </span>
        </div>

        <p className="mt-2 text-xs text-zinc-400">
          Sign in to unlock member-only EP basketball drops and saved basket preferences.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300">
              Member Name
            </label>
            <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5">
              <User className="h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full bg-transparent text-sm text-white focus:outline-none"
                placeholder="Your name"
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
                className="w-full bg-transparent text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 w-full cursor-pointer rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 py-3 text-xs font-bold tracking-[0.18em] text-black uppercase transition hover:brightness-110"
          >
            Sign In to Sole Purpose
          </button>
        </form>
      </div>
    </div>
  );
}
