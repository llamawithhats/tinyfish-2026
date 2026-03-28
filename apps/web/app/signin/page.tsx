export default function SignInPage() {
  return (
    <main className="shell">
      <section className="panel" style={{ maxWidth: 560, margin: "8vh auto 0" }}>
        <p className="pill">Magic link sign-in</p>
        <h1 className="sectionTitle" style={{ fontSize: "2rem" }}>
          Sign in to AutoIntern
        </h1>
        <p className="muted">Enter your email and we’ll send a one-time sign-in link through the configured SMTP server.</p>
        <form method="post" action="/api/auth/signin/email" className="stack" style={{ marginTop: 18 }}>
          <label className="label">
            Email
            <input className="input" type="email" name="email" required placeholder="you@example.com" />
          </label>
          <input type="hidden" name="callbackUrl" value="/dashboard" />
          <button className="button" type="submit">
            Send sign-in link
          </button>
        </form>
      </section>
    </main>
  );
}
