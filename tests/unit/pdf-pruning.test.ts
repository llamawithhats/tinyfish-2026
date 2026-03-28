import { estimateResumeLines, pruneResumeSpecToOnePage, renderResumeHtml } from "@autointern/pdf";
import type { ResumeSpec } from "@autointern/domain";

const verboseResume: ResumeSpec = {
  name: "Alex Chen",
  headline: "Software Engineering Intern",
  contactLine: "alex@example.com • github.com/alex • linkedin.com/in/alex",
  summary: "Student engineer focused on backend systems, full-stack product work, and practical AI integrations.",
  skills: ["TypeScript", "Node.js", "React", "PostgreSQL", "Docker", "Python", "Redis"],
  education: [
    {
      school: "Example University",
      degreeLine: "B.S. Computer Science",
      detailLine: "Graduates May 2027"
    }
  ],
  experience: Array.from({ length: 3 }).map((_, index) => ({
    company: `Company ${index + 1}`,
    roleLine: "Software Engineer Intern | 2025",
    bullets: Array.from({ length: 6 }).map((__, bulletIndex) => ({
      text: `Impact bullet ${bulletIndex + 1} for role ${index + 1}`,
      priority: bulletIndex < 2 ? 5 : 1
    }))
  })),
  projects: [
    {
      title: "Project One",
      subtitle: "TypeScript, Prisma",
      bullets: Array.from({ length: 4 }).map((_, index) => ({
        text: `Project bullet ${index + 1}`,
        priority: index === 0 ? 5 : 1
      }))
    },
    {
      title: "Project Two",
      subtitle: "Python, FastAPI",
      bullets: Array.from({ length: 4 }).map((_, index) => ({
        text: `Second project bullet ${index + 1}`,
        priority: index === 0 ? 5 : 1
      }))
    }
  ],
  extras: [
    {
      heading: "Leadership",
      items: ["Led a club", "Mentored peers"]
    }
  ]
};

describe("resume rendering", () => {
  it("prunes long resumes toward the page budget", () => {
    const pruned = pruneResumeSpecToOnePage(verboseResume);
    expect(estimateResumeLines(pruned)).toBeLessThanOrEqual(estimateResumeLines(verboseResume));
  });

  it("renders ATS-safe HTML without tables", () => {
    const html = renderResumeHtml(verboseResume);
    expect(html.toLowerCase()).not.toContain("<table");
    expect(html.toLowerCase()).not.toContain("grid-template-columns");
  });
});
