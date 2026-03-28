"use client";

import { useMemo, useState, useTransition } from "react";

type DashboardData = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    submissionMode: "APPROVAL_FIRST" | "AUTO_SUBMIT";
  };
  profile: Record<string, unknown> | null;
  credentials: Array<{ id: string; provider: string; label: string; username: string | null }>;
  searchPresets: Array<{ id: string; name: string; keywords: string[]; locations: string[]; companies: string[] }>;
  jobSources: Array<{ id: string; name: string; provider: string; sourceUrl: string; enabled: boolean }>;
  jobs: Array<{
    id: string;
    title: string;
    companyName: string;
    location: string | null;
    status: string;
    internshipScore: number;
  }>;
  applications: Array<{
    id: string;
    companyName: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
};

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function DashboardShell({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [notice, setNotice] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const profilePrefill = useMemo(() => {
    const profile = (data.profile ?? {}) as Record<string, unknown>;
    return {
      fullName: String(profile.fullName ?? ""),
      headline: String(profile.headline ?? ""),
      email: String(profile.email ?? data.user.email ?? ""),
      phone: String(profile.phone ?? ""),
      linkedinUrl: String(profile.linkedinUrl ?? ""),
      githubUrl: String(profile.githubUrl ?? ""),
      currentLocation: String(profile.currentLocation ?? ""),
      workAuthorization: String(profile.workAuthorization ?? ""),
      visaStatus: String(profile.visaStatus ?? ""),
      graduationDate: String(profile.graduationDate ?? ""),
      summary: String(profile.summary ?? ""),
      skills: Array.isArray(profile.skills) ? (profile.skills as string[]).join(", ") : "",
      screeningFacts: Array.isArray(profile.screeningFacts) ? (profile.screeningFacts as string[]).join(", ") : "",
      targetRoles: Array.isArray(profile.targetRoles) ? (profile.targetRoles as string[]).join(", ") : "",
      preferredLocations: Array.isArray(profile.preferredLocations) ? (profile.preferredLocations as string[]).join(", ") : ""
    };
  }, [data.profile, data.user.email]);

  function refresh() {
    startTransition(async () => {
      const [jobs, applications] = await Promise.all([
        fetch("/api/jobs", { cache: "no-store" }).then((res) => res.json()),
        fetch("/api/applications", { cache: "no-store" }).then((res) => res.json())
      ]);

      setData((current) => ({
        ...current,
        jobs,
        applications
      }));
    });
  }

  async function saveProfile(formData: FormData) {
    const payload = {
      fullName: formData.get("fullName"),
      headline: formData.get("headline"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      linkedinUrl: formData.get("linkedinUrl"),
      githubUrl: formData.get("githubUrl"),
      portfolioUrl: "",
      currentLocation: formData.get("currentLocation"),
      workAuthorization: formData.get("workAuthorization"),
      visaStatus: formData.get("visaStatus"),
      graduationDate: formData.get("graduationDate"),
      targetRoles: parseTags(String(formData.get("targetRoles") ?? "")),
      preferredLocations: parseTags(String(formData.get("preferredLocations") ?? "")),
      salaryExpectation: "",
      availability: "",
      summary: formData.get("summary"),
      skills: parseTags(String(formData.get("skills") ?? "")),
      screeningFacts: parseTags(String(formData.get("screeningFacts") ?? "")),
      education: [],
      experiences: [],
      projects: []
    };

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const next = await response.json();
    setData((current) => ({ ...current, profile: next }));
    setNotice("Profile saved.");
  }

  async function saveCredential(formData: FormData) {
    const response = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: formData.get("provider"),
        label: formData.get("label"),
        username: formData.get("username"),
        secret: formData.get("secret"),
        metadata: {}
      })
    });
    const next = await response.json();
    setData((current) => ({ ...current, credentials: [...current.credentials, next] }));
    setNotice("Credential stored.");
  }

  async function saveSource(formData: FormData) {
    const response = await fetch("/api/job-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("sourceName"),
        provider: formData.get("provider"),
        sourceUrl: formData.get("sourceUrl"),
        keywords: parseTags(String(formData.get("keywords") ?? "")),
        locations: parseTags(String(formData.get("locations") ?? "")),
        internshipOnly: true,
        maxDailyApplications: 10,
        countryCode: formData.get("countryCode")
      })
    });
    const next = await response.json();
    setData((current) => ({ ...current, jobSources: [...current.jobSources, next] }));
    setNotice("Job source saved and discovery queued.");
  }

  async function savePreset(formData: FormData) {
    const response = await fetch("/api/search-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("presetName"),
        companies: parseTags(String(formData.get("companies") ?? "")),
        keywords: parseTags(String(formData.get("presetKeywords") ?? "")),
        locations: parseTags(String(formData.get("presetLocations") ?? "")),
        internshipOnly: true,
        maxDailyApplications: 10
      })
    });
    const next = await response.json();
    setData((current) => ({ ...current, searchPresets: [...current.searchPresets, next] }));
    setNotice("Search preset saved.");
  }

  async function toggleMode() {
    const nextMode = data.user.submissionMode === "APPROVAL_FIRST" ? "AUTO_SUBMIT" : "APPROVAL_FIRST";
    await fetch("/api/settings/submission-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionMode: nextMode })
    });
    setData((current) => ({
      ...current,
      user: {
        ...current.user,
        submissionMode: nextMode
      }
    }));
    setNotice(`Submission mode updated to ${nextMode}.`);
  }

  async function generatePacket(jobId: string) {
    await fetch(`/api/jobs/${jobId}/generate-packet`, { method: "POST" });
    setNotice("Packet generation queued.");
    refresh();
  }

  async function approveApplication(applicationId: string) {
    await fetch(`/api/applications/${applicationId}/approve`, { method: "POST" });
    setNotice("Application approved and submission queued.");
    refresh();
  }

  return (
    <div className="dashboardGrid">
      <div className="stack">
        <section className="panel">
          <div className="metaRow" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <h1 className="sectionTitle" style={{ marginBottom: 6 }}>
                Candidate profile
              </h1>
              <p className="muted">
                This profile powers tailored resumes, cover letters, and form filling for {data.user.name ?? "your"} account.
              </p>
            </div>
            <button className="button secondary" onClick={toggleMode} type="button">
              Mode: {data.user.submissionMode}
            </button>
          </div>
          <form
            className="stack"
            action={(formData) =>
              startTransition(async () => {
                await saveProfile(formData);
              })
            }
          >
            <div className="formRow" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <label className="label">
                Full name
                <input className="input" name="fullName" defaultValue={profilePrefill.fullName} required />
              </label>
              <label className="label">
                Headline
                <input className="input" name="headline" defaultValue={profilePrefill.headline} required />
              </label>
              <label className="label">
                Email
                <input className="input" type="email" name="email" defaultValue={profilePrefill.email} required />
              </label>
              <label className="label">
                Phone
                <input className="input" name="phone" defaultValue={profilePrefill.phone} required />
              </label>
              <label className="label">
                LinkedIn
                <input className="input" name="linkedinUrl" defaultValue={profilePrefill.linkedinUrl} />
              </label>
              <label className="label">
                GitHub
                <input className="input" name="githubUrl" defaultValue={profilePrefill.githubUrl} />
              </label>
              <label className="label">
                Location
                <input className="input" name="currentLocation" defaultValue={profilePrefill.currentLocation} required />
              </label>
              <label className="label">
                Work authorization
                <input className="input" name="workAuthorization" defaultValue={profilePrefill.workAuthorization} required />
              </label>
              <label className="label">
                Visa / sponsorship
                <input className="input" name="visaStatus" defaultValue={profilePrefill.visaStatus} />
              </label>
              <label className="label">
                Graduation date
                <input className="input" name="graduationDate" defaultValue={profilePrefill.graduationDate} />
              </label>
            </div>
            <label className="label">
              Summary
              <textarea className="textarea" name="summary" defaultValue={profilePrefill.summary} required />
            </label>
            <label className="label">
              Skills
              <input className="input" name="skills" defaultValue={profilePrefill.skills} placeholder="TypeScript, React, Python" />
            </label>
            <label className="label">
              Target roles
              <input className="input" name="targetRoles" defaultValue={profilePrefill.targetRoles} placeholder="software engineer intern, backend intern" />
            </label>
            <label className="label">
              Preferred locations
              <input className="input" name="preferredLocations" defaultValue={profilePrefill.preferredLocations} placeholder="Singapore, New York, Remote" />
            </label>
            <label className="label">
              Screening facts
              <textarea
                className="textarea"
                name="screeningFacts"
                defaultValue={profilePrefill.screeningFacts}
                placeholder="US work authorization, available May 2026, willing to relocate"
              />
            </label>
            <button className="button" type="submit" disabled={pending}>
              Save profile
            </button>
          </form>
        </section>

        <section className="panel">
          <h2 className="sectionTitle">Search presets</h2>
          <form
            className="stack"
            action={(formData) =>
              startTransition(async () => {
                await savePreset(formData);
              })
            }
          >
            <label className="label">
              Preset name
              <input className="input" name="presetName" required placeholder="US backend internships" />
            </label>
            <label className="label">
              Companies
              <input className="input" name="companies" placeholder="Stripe, Figma, Notion" />
            </label>
            <label className="label">
              Keywords
              <input className="input" name="presetKeywords" required placeholder="backend, platform, software intern" />
            </label>
            <label className="label">
              Locations
              <input className="input" name="presetLocations" placeholder="Remote, New York, Singapore" />
            </label>
            <button className="button secondary" type="submit" disabled={pending}>
              Save preset
            </button>
          </form>
          <ul className="list" style={{ marginTop: 16 }}>
            {data.searchPresets.map((preset) => (
              <li key={preset.id} className="listItem">
                <strong>{preset.name}</strong>
                <div className="metaRow">
                  <span>{preset.keywords.join(", ")}</span>
                  <span>{preset.locations.join(", ") || "Any location"}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2 className="sectionTitle">ATS sources</h2>
          <form
            className="stack"
            action={(formData) =>
              startTransition(async () => {
                await saveSource(formData);
              })
            }
          >
            <div className="formRow" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <label className="label">
                Name
                <input className="input" name="sourceName" required placeholder="Stripe internships" />
              </label>
              <label className="label">
                Provider
                <select className="select" name="provider" defaultValue="GREENHOUSE">
                  <option value="GREENHOUSE">Greenhouse</option>
                  <option value="LEVER">Lever</option>
                  <option value="ASHBY">Ashby</option>
                  <option value="WORKABLE">Workable</option>
                  <option value="GENERIC_ATS">Generic ATS</option>
                </select>
              </label>
              <label className="label">
                Country code
                <input className="input" name="countryCode" placeholder="US" />
              </label>
            </div>
            <label className="label">
              ATS listing URL
              <input className="input" name="sourceUrl" required placeholder="https://boards.greenhouse.io/company" />
            </label>
            <label className="label">
              Keywords
              <input className="input" name="keywords" placeholder="software intern, backend, distributed systems" />
            </label>
            <label className="label">
              Locations
              <input className="input" name="locations" placeholder="Singapore, Remote" />
            </label>
            <button className="button" type="submit" disabled={pending}>
              Save source and queue discovery
            </button>
          </form>
          <ul className="list" style={{ marginTop: 16 }}>
            {data.jobSources.map((source) => (
              <li key={source.id} className="listItem">
                <strong>{source.name}</strong>
                <div className="metaRow">
                  <span>{source.provider}</span>
                  <span>{source.sourceUrl}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="stack">
        <section className="panel">
          <h2 className="sectionTitle">Provider credentials</h2>
          <form
            className="stack"
            action={(formData) =>
              startTransition(async () => {
                await saveCredential(formData);
              })
            }
          >
            <label className="label">
              Provider
              <input className="input" name="provider" required placeholder="GREENHOUSE" />
            </label>
            <label className="label">
              Label
              <input className="input" name="label" required placeholder="Greenhouse login" />
            </label>
            <label className="label">
              Username / email
              <input className="input" name="username" placeholder="you@example.com" />
            </label>
            <label className="label">
              Secret / password
              <input className="input" type="password" name="secret" required />
            </label>
            <button className="button" type="submit" disabled={pending}>
              Store encrypted credential
            </button>
          </form>
          <ul className="list" style={{ marginTop: 16 }}>
            {data.credentials.map((credential) => (
              <li key={credential.id} className="listItem">
                <strong>{credential.label}</strong>
                <div className="metaRow">
                  <span>{credential.provider}</span>
                  <span>{credential.username ?? "No username stored"}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="metaRow" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <h2 className="sectionTitle" style={{ marginBottom: 0 }}>
              Matched jobs
            </h2>
            <button className="button secondary" onClick={refresh} type="button">
              Refresh
            </button>
          </div>
          <ul className="list">
            {data.jobs.map((job) => (
              <li key={job.id} className="listItem">
                <strong>
                  {job.title} at {job.companyName}
                </strong>
                <div className="metaRow" style={{ marginTop: 8 }}>
                  <span>{job.location || "Location not specified"}</span>
                  <span>Status: {job.status}</span>
                  <span>Match: {Math.round(job.internshipScore * 100)}%</span>
                </div>
                <button className="button secondary" style={{ marginTop: 10 }} type="button" onClick={() => generatePacket(job.id)}>
                  Generate packet
                </button>
              </li>
            ))}
            {data.jobs.length === 0 ? <li className="listItem muted">No matched jobs yet. Add a source to start discovery.</li> : null}
          </ul>
        </section>

        <section className="panel">
          <h2 className="sectionTitle">Application queue</h2>
          <ul className="list">
            {data.applications.map((application) => (
              <li key={application.id} className="listItem">
                <strong>
                  {application.title} at {application.companyName}
                </strong>
                <div className="metaRow" style={{ marginTop: 8 }}>
                  <span>Status: {application.status}</span>
                  <span>{new Date(application.createdAt).toLocaleString()}</span>
                </div>
                {application.status === "READY_FOR_REVIEW" ? (
                  <button className="button secondary" style={{ marginTop: 10 }} type="button" onClick={() => approveApplication(application.id)}>
                    Approve and submit
                  </button>
                ) : null}
              </li>
            ))}
            {data.applications.length === 0 ? <li className="listItem muted">No application packets yet.</li> : null}
          </ul>
        </section>

        {notice ? <div className="card">{notice}</div> : null}
      </div>
    </div>
  );
}
