"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";

type Mode = "signin" | "register";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!username || !password) {
      setMessage("Username and password are required.");
      return;
    }

    if (mode === "register") {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Could not create account.");
        return;
      }
    }

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl: "/dashboard"
    });

    if (result?.error) {
      setMessage("Incorrect username or password.");
      return;
    }

    window.location.href = result?.url ?? "/dashboard";
  }

  return (
    <section className="panel" style={{ maxWidth: 560, margin: "8vh auto 0" }}>
      <div className="metaRow" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <p className="pill">Prototype auth</p>
        <div className="metaRow">
          <button className="button secondary" type="button" onClick={() => setMode("signin")}>
            Sign in
          </button>
          <button className="button secondary" type="button" onClick={() => setMode("register")}>
            Create account
          </button>
        </div>
      </div>
      <h1 className="sectionTitle" style={{ fontSize: "2rem" }}>
        {mode === "signin" ? "Sign in to AutoIntern" : "Create a prototype account"}
      </h1>
      <p className="muted">
        {mode === "signin"
          ? "Use the username and password you created locally. No email verification is required."
          : "Create a local prototype account with a username and password. You can add profile details later in the dashboard."}
      </p>
      <form
        className="stack"
        style={{ marginTop: 18 }}
        action={(formData) =>
          startTransition(async () => {
            await handleSubmit(formData);
          })
        }
      >
        <label className="label">
          Username
          <input className="input" name="username" required placeholder="joel" autoComplete="username" />
        </label>
        <label className="label">
          Password
          <input className="input" type="password" name="password" required autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        </label>
        <button className="button" type="submit" disabled={pending}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      {message ? <div className="card" style={{ marginTop: 16 }}>{message}</div> : null}
    </section>
  );
}
