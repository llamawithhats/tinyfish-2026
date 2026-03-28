export default function HelpPage() {
  return (
    <div className="stack">
      <section className="panel">
        <div className="pill" style={{ marginBottom: 12 }}>
          Getting started
        </div>
        <h1 className="sectionTitle" style={{ fontSize: "1.5rem", marginBottom: 10 }}>
          How to use AutoIntern
        </h1>
        <p className="muted" style={{ maxWidth: "70ch" }}>
          AutoIntern is now a materials workflow. It discovers internship roles, then generates a tailored resume and
          cover letter for jobs you choose from the queue.
        </p>
      </section>

      <section className="panel">
        <h2 className="sectionTitle">Before you begin</h2>
        <ul className="list">
          <li className="listItem">
            <strong>Start the local services</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              Run <code>docker compose up -d postgres redis minio minio-setup mailpit</code>.
            </div>
          </li>
          <li className="listItem">
            <strong>Start the app and worker</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              Run <code>npm run dev:web</code> and <code>npm run dev:worker</code> in separate terminals.
            </div>
          </li>
          <li className="listItem">
            <strong>Confirm your API keys</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              Your <code>.env</code> should include working <code>TINYFISH_API_KEY</code> and <code>LLM_API_KEY</code>
              values before generating materials.
            </div>
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2 className="sectionTitle">First successful run</h2>
        <ol className="helpSteps">
          <li>
            Open the <strong>Dashboard</strong> tab and save your candidate profile.
          </li>
          <li>
            Add an ATS source such as <code>https://boards.greenhouse.io/stripe</code> with provider{" "}
            <code>GREENHOUSE</code> and country code <code>US</code>.
          </li>
          <li>
            Wait for <strong>Worker activity</strong> to show a completed discovery run and for real roles to appear in{" "}
            <strong>Matched jobs</strong>.
          </li>
          <li>
            Click <strong>Generate materials</strong> on a real job listing.
          </li>
          <li>
            Open the <strong>Materials queue</strong> and use <strong>View resume</strong> or{" "}
            <strong>View cover letter</strong> once generation finishes.
          </li>
        </ol>
      </section>

      <section className="panel">
        <h2 className="sectionTitle">What each section does</h2>
        <ul className="list">
          <li className="listItem">
            <strong>Candidate profile</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              This is the source of truth for the generated resume and cover letter.
            </div>
          </li>
          <li className="listItem">
            <strong>ATS sources</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              These tell TinyFish where to discover internships from supported job boards.
            </div>
          </li>
          <li className="listItem">
            <strong>Matched jobs</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              These are discovered roles you can choose to generate materials for.
            </div>
          </li>
          <li className="listItem">
            <strong>Materials queue</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              This tracks jobs currently generating materials, ready to review, or failed and needing a retry.
            </div>
          </li>
          <li className="listItem">
            <strong>Worker activity</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              This shows the last few discovery and materials-generation runs, including concise error messages.
            </div>
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2 className="sectionTitle">Common issues</h2>
        <ul className="list">
          <li className="listItem">
            <strong>No jobs appear after adding a source</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              Check the Worker activity panel first. Most discovery failures come from an invalid provider and URL
              combination or a blocked TinyFish request.
            </div>
          </li>
          <li className="listItem">
            <strong>Materials generation fails</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              Make sure your profile is saved and your LLM key is valid. Failed items can be retried from the
              Materials queue.
            </div>
          </li>
          <li className="listItem">
            <strong>You only see Discovery Sweep</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              That is a synthetic discovery record. Wait for real matched jobs before generating materials.
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
