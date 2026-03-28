import { chromium } from "playwright";
import type { ResumeSpec } from "@autointern/domain";

const MAX_LINE_BUDGET = 54;

export function estimateResumeLines(spec: ResumeSpec): number {
  return (
    6 +
    Math.ceil(spec.summary.length / 90) +
    Math.ceil(spec.skills.join(" • ").length / 90) +
    spec.education.length * 2 +
    spec.experience.reduce((sum, item) => sum + 2 + item.bullets.length, 0) +
    spec.projects.reduce((sum, item) => sum + 1 + item.bullets.length, 0) +
    spec.extras.reduce((sum, item) => sum + 1 + item.items.length, 0)
  );
}

export function pruneResumeSpecToOnePage(spec: ResumeSpec): ResumeSpec {
  const clone: ResumeSpec = JSON.parse(JSON.stringify(spec));
  if (estimateResumeLines(clone) <= MAX_LINE_BUDGET) {
    return clone;
  }

  const sortedExperience = clone.experience.map((item) => ({
    ...item,
    bullets: [...item.bullets].sort((a, b) => a.priority - b.priority)
  }));

  const sortedProjects = clone.projects.map((item) => ({
    ...item,
    bullets: [...item.bullets].sort((a, b) => a.priority - b.priority)
  }));

  clone.experience = sortedExperience;
  clone.projects = sortedProjects;

  while (estimateResumeLines(clone) > MAX_LINE_BUDGET) {
    const removableExperience = clone.experience.find((item) => item.bullets.length > 2);
    if (removableExperience) {
      removableExperience.bullets.shift();
      continue;
    }

    const removableProject = clone.projects.find((item) => item.bullets.length > 1);
    if (removableProject) {
      removableProject.bullets.shift();
      continue;
    }

    if (clone.projects.length > 1) {
      clone.projects.pop();
      continue;
    }

    if (clone.extras.length > 0) {
      clone.extras.pop();
      continue;
    }

    break;
  }

  return clone;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderResumeHtml(spec: ResumeSpec): string {
  const pruned = pruneResumeSpecToOnePage(spec);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #111827;
        margin: 0;
        padding: 0.45in 0.55in;
        font-size: 10.5pt;
        line-height: 1.28;
      }
      h1, h2, h3, p { margin: 0; }
      .header { margin-bottom: 12px; }
      .name { font-size: 22pt; font-weight: 700; letter-spacing: -0.03em; }
      .headline { font-size: 11pt; margin-top: 4px; color: #334155; }
      .contact { font-size: 9.5pt; margin-top: 4px; color: #475569; }
      section { margin-top: 12px; }
      .section-title {
        font-size: 9.5pt;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-weight: 700;
        border-bottom: 1px solid #cbd5e1;
        padding-bottom: 3px;
        margin-bottom: 6px;
      }
      .entry { margin-bottom: 7px; }
      .entry-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-weight: 700;
      }
      ul {
        margin: 4px 0 0 16px;
        padding: 0;
      }
      li { margin: 2px 0; }
      .skills { margin-top: 4px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="name">${escapeHtml(pruned.name)}</div>
      <div class="headline">${escapeHtml(pruned.headline)}</div>
      <div class="contact">${escapeHtml(pruned.contactLine)}</div>
    </div>
    <section>
      <div class="section-title">Summary</div>
      <p>${escapeHtml(pruned.summary)}</p>
    </section>
    <section>
      <div class="section-title">Skills</div>
      <p class="skills">${escapeHtml(pruned.skills.join(" • "))}</p>
    </section>
    <section>
      <div class="section-title">Education</div>
      ${pruned.education
        .map(
          (item) => `<div class="entry">
              <div class="entry-header"><span>${escapeHtml(item.school)}</span><span>${escapeHtml(item.degreeLine)}</span></div>
              ${item.detailLine ? `<p>${escapeHtml(item.detailLine)}</p>` : ""}
            </div>`
        )
        .join("")}
    </section>
    <section>
      <div class="section-title">Experience</div>
      ${pruned.experience
        .map(
          (item) => `<div class="entry">
            <div class="entry-header"><span>${escapeHtml(item.company)}</span><span>${escapeHtml(item.roleLine)}</span></div>
            <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet.text)}</li>`).join("")}</ul>
          </div>`
        )
        .join("")}
    </section>
    <section>
      <div class="section-title">Projects</div>
      ${pruned.projects
        .map(
          (item) => `<div class="entry">
            <div class="entry-header"><span>${escapeHtml(item.title)}</span><span>${escapeHtml(item.subtitle ?? "")}</span></div>
            <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet.text)}</li>`).join("")}</ul>
          </div>`
        )
        .join("")}
    </section>
    ${pruned.extras
      .map(
        (section) => `<section>
          <div class="section-title">${escapeHtml(section.heading)}</div>
          <ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>`
      )
      .join("")}
  </body>
</html>`;
}

export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  const pdf = await page.pdf({
    format: "Letter",
    printBackground: true,
    margin: {
      top: "0.35in",
      right: "0.35in",
      bottom: "0.35in",
      left: "0.35in"
    }
  });
  await browser.close();
  return Buffer.from(pdf);
}
