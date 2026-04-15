"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface AuthFormProps {
  onAuthSuccess: () => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username_hint: username.trim() || null }
          }
        });
        if (error) throw error;
        if (data.session?.user && username.trim()) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ username: username.trim().toLowerCase() })
            .eq("id", data.session.user.id);
          if (profileError) {
            setMessage("Account created. Username may need to be edited from profile settings.");
          }
        }
        setMessage("Sign-up submitted. If email confirmation is enabled, confirm your inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-5xl font-light italic text-zinc-100">Movie Rater</h1>
          <p className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">
            Your personal film journal
          </p>
        </div>

        <div className="surface p-6">
          <div className="mb-5 flex gap-1 rounded border border-line p-0.5">
            <button
              className={`flex-1 rounded py-1.5 text-sm transition-colors duration-150 ${
                mode === "login" ? "bg-accent text-black font-medium" : "text-zinc-500 hover:text-zinc-300"
              }`}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              className={`flex-1 rounded py-1.5 text-sm transition-colors duration-150 ${
                mode === "signup" ? "bg-accent text-black font-medium" : "text-zinc-500 hover:text-zinc-300"
              }`}
              onClick={() => setMode("signup")}
            >
              Create account
            </button>
          </div>

          <form className="space-y-3" onSubmit={submit}>
            <input
              className="w-full rounded border border-line bg-transparent px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-accent/60"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full rounded border border-line bg-transparent px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-accent/60"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {mode === "signup" && (
              <input
                className="w-full rounded border border-line bg-transparent px-3 py-2 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-accent/60"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            )}
            <button className="btn-primary w-full justify-center" disabled={busy} type="submit">
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          {message && <p className="mt-4 font-mono text-xs text-zinc-500">{message}</p>}
        </div>
      </div>
    </div>
  );
}
