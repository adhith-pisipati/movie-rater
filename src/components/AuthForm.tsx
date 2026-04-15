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
    <section className="surface mx-auto mt-16 w-full max-w-md p-6">
      <h1 className="text-2xl font-semibold">Movie Rater</h1>
      <p className="mt-1 text-sm text-zinc-400">Sign in to save rankings, profiles, and friends in Supabase.</p>
      <div className="mt-4 flex gap-2">
        <button className={mode === "login" ? "btn-primary" : "btn"} onClick={() => setMode("login")}>
          Log in
        </button>
        <button className={mode === "signup" ? "btn-primary" : "btn"} onClick={() => setMode("signup")}>
          Sign up
        </button>
      </div>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <input
          className="w-full rounded-lg border border-line bg-zinc-900 px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-line bg-zinc-900 px-3 py-2 text-sm"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {mode === "signup" && (
          <input
            className="w-full rounded-lg border border-line bg-zinc-900 px-3 py-2 text-sm"
            placeholder="Preferred username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <button className="btn-primary w-full" disabled={busy} type="submit">
          {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-zinc-300">{message}</p>}
    </section>
  );
}
