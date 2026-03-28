import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="pill">TinyFish-powered ATS automation</p>
          <h1 className="headline">Apply to better internships with less repetitive work.</h1>
          <p className="lede">
            AutoIntern watches the internship sources you care about, scrapes the job description, generates a truthful
            one-page resume and cover letter, prepares screening answers, and either queues the application for review or
            submits it automatically.
          </p>
          <div className="ctaRow">
            <Link className="button" href="/signin">
              Start with username sign-in
            </Link>
            <a className="button secondary" href="#how-it-works">
              See the workflow
            </a>
          </div>
        </div>
        <div className="panel">
          <div className="stats">
            <div className="card">
              <div className="statValue">1-page</div>
              <div className="muted">Resume budget enforced in prompt and renderer.</div>
            </div>
            <div className="card">
              <div className="statValue">ATS-safe</div>
              <div className="muted">No tables, no columns, no decorative layout tricks.</div>
            </div>
            <div className="card">
              <div className="statValue">Prototype auth</div>
              <div className="muted">Simple username/password onboarding with no email verification.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="panel" style={{ marginTop: 24 }}>
        <h2 className="sectionTitle">How it works</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="card">
            <strong>1. Build your profile</strong>
            <p className="muted">Capture the same details you would normally retype across internship forms.</p>
          </div>
          <div className="card">
            <strong>2. Add ATS sources</strong>
            <p className="muted">Track Greenhouse, Lever, Ashby, Workable, and other hosted application pages.</p>
          </div>
          <div className="card">
            <strong>3. Generate packets</strong>
            <p className="muted">Each listing gets a tailored resume, cover letter, and screening answer set.</p>
          </div>
          <div className="card">
            <strong>4. Submit with control</strong>
            <p className="muted">Choose approval-first review or explicit auto-submit for supported flows.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
