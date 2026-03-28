"use client";

import { useMemo, useState, useTransition } from "react";

type DashboardData = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
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
    isSynthetic: boolean;
  }>;
  applications: Array<{
    id: string;
    jobId: string;
    packetId: string | null;
    companyName: string;
    title: string;
    status: string;
    hasMaterials: boolean;
    createdAt: string;
  }>;
  runs: Array<{
    id: string;
    runType: string;
    status: string;
    tinyfishRunId: string | null;
    errorMessage: string | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    jobTitle: string;
    companyName: string;
  }>;
};

const MAX_ITEMS_PER_SECTION = 5;

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const supportedProxyCountryCodes = new Set(["US", "GB", "CA", "DE", "FR", "JP", "AU"]);

function formatRunType(runType: string): string {
  switch (runType) {
    case "DISCOVERY":
      return "Discovery";
    case "PACKET":
      return "Materials";
    case "APPLY":
      return "Legacy apply";
    default:
      return runType;
  }
}

function formatMaterialsStatus(status: string): string {
  switch (status) {
    case "PACKET_QUEUED":
      return "Generating resume and cover letter";
    case "READY_FOR_REVIEW":
      return "Materials ready";
    case "FAILED":
      return "Generation failed";
    default:
      return status;
  }
}

function getTinyFishStreamingUrl(runId: string): string {
  return `https://stream.agent.tinyfish.ai/session/${encodeURIComponent(runId)}`;
}

function summarizeError(message: string): string {
  const firstLine = message.split(/\r?\n/, 1)[0]?.trim() ?? "";

  if (firstLine.length <= 220) {
    return firstLine;
  }

  return `${firstLine.slice(0, 217)}...`;
}

function validateSourceInput(provider: string, sourceUrl: string, countryCode: string): string | null {
  let hostname = "";

  try {
    hostname = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    return "Enter a valid ATS listing URL.";
  }

  if (provider === "GREENHOUSE" && !hostname.includes("greenhouse.io")) {
    return "Greenhouse sources should use a greenhouse.io board URL.";
  }

  if (provider === "LEVER" && !hostname.includes("lever.co")) {
    return "Lever sources should use a lever.co listings URL.";
  }

  if (provider === "ASHBY" && !hostname.includes("ashbyhq.com")) {
    return "Ashby sources should use an ashbyhq.com jobs URL.";
  }

  if (provider === "WORKABLE" && !hostname.includes("workable.com")) {
    return "Workable sources should use a workable.com jobs URL.";
  }

  if (countryCode) {
    const normalized = countryCode.trim().toUpperCase();
    if (!supportedProxyCountryCodes.has(normalized)) {
      return `Country code must be one of: ${Array.from(supportedProxyCountryCodes).join(", ")}.`;
    }
  }

  return null;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export function DashboardShell({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [notice, setNotice] = useState<string>("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    initialData.runs.find((run) => run.tinyfishRunId)?.tinyfishRunId ?? null
  );
  const [activeAction, setActiveAction] = useState<string | null>(null);
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
  const selectedRun = data.runs.find((run) => run.tinyfishRunId === selectedRunId) ?? null;
  const visibleCredentials = data.credentials.slice(0, MAX_ITEMS_PER_SECTION);
  const visibleSearchPresets = data.searchPresets.slice(0, MAX_ITEMS_PER_SECTION);
  const visibleJobSources = data.jobSources.slice(0, MAX_ITEMS_PER_SECTION);
  const visibleRuns = data.runs.slice(0, MAX_ITEMS_PER_SECTION);
  const visibleJobs = data.jobs.slice(0, MAX_ITEMS_PER_SECTION);
  const visibleApplications = data.applications.slice(0, MAX_ITEMS_PER_SECTION);

  function isActionPending(action: string) {
    return pending && activeAction === action;
  }

  function runAction(action: string, loadingMessage: string, task: () => Promise<void>) {
    setActiveAction(action);
    setNotice(loadingMessage);
    startTransition(async () => {
      try {
        await task();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Request failed.");
      } finally {
        setActiveAction((current) => (current === action ? null : current));
      }
    });
  }

  async function loadDashboardData() {
    const [jobs, applications, runs] = await Promise.all([
      fetch("/api/jobs", { cache: "no-store" }).then((res) => readJsonResponse<DashboardData["jobs"]>(res)),
      fetch("/api/applications", { cache: "no-store" }).then((res) => readJsonResponse<DashboardData["applications"]>(res)),
      fetch("/api/runs", { cache: "no-store" }).then((res) => readJsonResponse<DashboardData["runs"]>(res))
    ]);

    setData((current) => ({
      ...current,
      jobs,
      applications,
      runs
    }));
  }

  function refresh() {
    runAction("refresh", "Refreshing dashboard...", async () => {
      await loadDashboardData();
      setNotice("Dashboard refreshed.");
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
    const next = await readJsonResponse<Record<string, unknown>>(response);
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
    const next = await readJsonResponse<DashboardData["credentials"][number]>(response);
    setData((current) => ({ ...current, credentials: [...current.credentials, next] }));
    setNotice("Credential stored.");
  }

  async function saveSource(formData: FormData) {
    const provider = String(formData.get("provider") ?? "");
    const sourceUrl = String(formData.get("sourceUrl") ?? "");
    const countryCode = String(formData.get("countryCode") ?? "").trim().toUpperCase();
    const validationError = validateSourceInput(provider, sourceUrl, countryCode);

    if (validationError) {
      setNotice(validationError);
      return;
    }

    const response = await fetch("/api/job-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("sourceName"),
        provider,
        sourceUrl,
        keywords: parseTags(String(formData.get("keywords") ?? "")),
        locations: parseTags(String(formData.get("locations") ?? "")),
        internshipOnly: true,
        maxDailyApplications: 10,
        countryCode
      })
    });
    const next = await readJsonResponse<DashboardData["jobSources"][number]>(response);
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
    const next = await readJsonResponse<DashboardData["searchPresets"][number]>(response);
    setData((current) => ({ ...current, searchPresets: [...current.searchPresets, next] }));
    setNotice("Search preset saved.");
  }

  async function generatePacket(jobId: string) {
    const response = await fetch(`/api/jobs/${jobId}/generate-packet`, { method: "POST" });
    await readJsonResponse(response);
    await loadDashboardData();
    setNotice("Resume and cover letter generation queued.");
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
                This profile powers tailored resumes and cover letters for {data.user.name ?? "your"} account.
              </p>
            </div>
            <div className="card" style={{ padding: "10px 14px" }}>Materials-only workflow</div>
          </div>
          <form
            className="stack"
            action={(formData) => runAction("profile", "Saving profile...", () => saveProfile(formData))}
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
              {isActionPending("profile") ? "Saving profile..." : "Save profile"}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2 className="sectionTitle">Search presets</h2>
          <form
            className="stack"
            action={(formData) => runAction("preset", "Saving search preset...", () => savePreset(formData))}
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
              {isActionPending("preset") ? "Saving preset..." : "Save preset"}
            </button>
          </form>
          <ul className="list" style={{ marginTop: 16 }}>
            {visibleSearchPresets.map((preset) => (
              <li key={preset.id} className="listItem">
                <strong>{preset.name}</strong>
                <div className="metaRow">
                  <span>{preset.keywords.join(", ")}</span>
                  <span>{preset.locations.join(", ") || "Any location"}</span>
                </div>
              </li>
            ))}
            {data.searchPresets.length > MAX_ITEMS_PER_SECTION ? (
              <li className="listItem muted">Showing the 5 most recent presets.</li>
            ) : null}
          </ul>
        </section>

        <section className="panel">
          <h2 className="sectionTitle">ATS sources</h2>
          <form
            className="stack"
            action={(formData) => runAction("source", "Saving source and queueing discovery...", () => saveSource(formData))}
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
              {isActionPending("source") ? "Queueing discovery..." : "Save source and queue discovery"}
            </button>
          </form>
          <ul className="list" style={{ marginTop: 16 }}>
            {visibleJobSources.map((source) => (
              <li key={source.id} className="listItem">
                <strong>{source.name}</strong>
                <div className="metaRow">
                  <span>{source.provider}</span>
                  <span>{source.sourceUrl}</span>
                </div>
              </li>
            ))}
            {data.jobSources.length > MAX_ITEMS_PER_SECTION ? (
              <li className="listItem muted">Showing the 5 most recent sources.</li>
            ) : null}
          </ul>
        </section>
      </div>

      <div className="stack">
        <section className="panel">
          <div className="metaRow" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <h2 className="sectionTitle" style={{ marginBottom: 0 }}>
                Worker activity
              </h2>
              <p className="muted">Recent discovery and materials-generation runs created by the worker.</p>
            </div>
            <button className="button secondary" onClick={refresh} type="button" disabled={pending}>
              {isActionPending("refresh") ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <ul className="list">
            {visibleRuns.map((run) => (
              <li key={run.id} className="listItem">
                <strong>
                  {formatRunType(run.runType)}: {run.jobTitle} at {run.companyName}
                </strong>
                <div className="metaRow" style={{ marginTop: 8 }}>
                  <span>Status: {run.status}</span>
                  <span>Started: {run.startedAt ? new Date(run.startedAt).toLocaleString() : "Queued"}</span>
                  <span>{run.finishedAt ? `Finished: ${new Date(run.finishedAt).toLocaleString()}` : "In progress"}</span>
                </div>
                {run.tinyfishRunId ? (
                  <div className="metaRow" style={{ marginTop: 8, justifyContent: "space-between" }}>
                    <span className="muted">TinyFish run: {run.tinyfishRunId}</span>
                    <button className="button secondary" type="button" onClick={() => setSelectedRunId(run.tinyfishRunId)}>
                      Open live view
                    </button>
                  </div>
                ) : null}
                {run.errorMessage ? (
                  <div className="muted" style={{ marginTop: 8 }}>
                    Error: {summarizeError(run.errorMessage)}
                  </div>
                ) : null}
              </li>
            ))}
            {data.runs.length === 0 ? <li className="listItem muted">No worker activity yet. Add a source or generate a packet to create runs.</li> : null}
            {data.runs.length > MAX_ITEMS_PER_SECTION ? <li className="listItem muted">Showing the 5 most recent runs.</li> : null}
          </ul>
        </section>

        {selectedRun ? (
          <section className="panel">
            <div className="metaRow" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <h2 className="sectionTitle" style={{ marginBottom: 0 }}>
                  TinyFish live run
                </h2>
                <p className="muted">
                  {formatRunType(selectedRun.runType)} for {selectedRun.jobTitle} at {selectedRun.companyName}
                </p>
              </div>
              <a
                className="button secondary"
                href={getTinyFishStreamingUrl(selectedRun.tinyfishRunId ?? "")}
                rel="noreferrer"
                target="_blank"
              >
                Open in new tab
              </a>
            </div>
            <iframe
              title="TinyFish live run"
              src={getTinyFishStreamingUrl(selectedRun.tinyfishRunId ?? "")}
              style={{ width: "100%", minHeight: 520, border: 0, borderRadius: 16, background: "#0b1020" }}
            />
          </section>
        ) : null}

        <section className="panel">
          <div className="metaRow" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <h2 className="sectionTitle" style={{ marginBottom: 0 }}>
              Matched jobs
            </h2>
            <button className="button secondary" onClick={refresh} type="button" disabled={pending}>
              {isActionPending("refresh") ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <ul className="list">
            {visibleJobs.map((job) => (
              <li key={job.id} className="listItem">
                <strong>
                  {job.title} at {job.companyName}
                </strong>
                <div className="metaRow" style={{ marginTop: 8 }}>
                  <span>{job.location || "Location not specified"}</span>
                  <span>Status: {job.status}</span>
                  <span>Match: {Math.round(job.internshipScore * 100)}%</span>
                </div>
                {job.isSynthetic ? (
                  <div className="muted" style={{ marginTop: 10 }}>
                    Synthetic discovery record. Wait for real matched jobs before generating a packet.
                  </div>
                ) : (
                  <button
                    className="button secondary"
                    style={{ marginTop: 10 }}
                    type="button"
                    onClick={() =>
                      runAction(
                        `packet:${job.id}`,
                        `Queueing resume and cover letter generation for ${job.title}...`,
                        () => generatePacket(job.id)
                      )
                    }
                    disabled={pending}
                  >
                    {isActionPending(`packet:${job.id}`) ? "Queueing materials..." : "Generate materials"}
                  </button>
                )}
              </li>
            ))}
            {data.jobs.length === 0 ? <li className="listItem muted">No matched jobs yet. Add a source to start discovery.</li> : null}
            {data.jobs.length > MAX_ITEMS_PER_SECTION ? <li className="listItem muted">Showing the 5 most recent matched jobs.</li> : null}
          </ul>
        </section>

        <section className="panel">
          <h2 className="sectionTitle">Materials queue</h2>
          <ul className="list">
            {visibleApplications.map((application) => (
              <li key={application.id} className="listItem">
                <strong>
                  {application.title} at {application.companyName}
                </strong>
                <div className="metaRow" style={{ marginTop: 8 }}>
                  <span>Status: {formatMaterialsStatus(application.status)}</span>
                  <span>{new Date(application.createdAt).toLocaleString()}</span>
                </div>
                <div className="muted" style={{ marginTop: 8 }}>
                  {application.hasMaterials
                    ? "Resume and cover letter generated."
                    : application.status === "FAILED"
                      ? "Generation failed before materials were created. Try again."
                      : "Resume and cover letter are still being generated."}
                </div>
                {application.hasMaterials ? (
                  <div className="metaRow" style={{ marginTop: 10, gap: 10 }}>
                    <a
                      className="button secondary"
                      href={`/api/applications/${application.id}/materials/resume`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View resume
                    </a>
                    <a
                      className="button secondary"
                      href={`/api/applications/${application.id}/materials/cover-letter`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View cover letter
                    </a>
                  </div>
                ) : null}
                {application.status !== "PACKET_QUEUED" ? (
                  <button
                    className="button secondary"
                    style={{ marginTop: 10 }}
                    type="button"
                    onClick={() =>
                      runAction(
                        `packet:${application.jobId}`,
                        `Queueing resume and cover letter generation for ${application.title}...`,
                        () => generatePacket(application.jobId)
                      )
                    }
                    disabled={pending}
                  >
                    {isActionPending(`packet:${application.jobId}`)
                      ? "Queueing materials..."
                      : application.status === "FAILED"
                        ? "Try again"
                        : "Regenerate materials"}
                  </button>
                ) : null}
              </li>
            ))}
            {data.applications.length === 0 ? <li className="listItem muted">No queued materials yet.</li> : null}
            {data.applications.length > MAX_ITEMS_PER_SECTION ? (
              <li className="listItem muted">Showing the 5 most recent queue items.</li>
            ) : null}
          </ul>
        </section>

        {notice ? <div className="card">{notice}</div> : null}
      </div>
    </div>
  );
}
