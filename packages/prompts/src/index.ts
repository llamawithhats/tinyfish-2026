import type { JobListingExtraction, UserProfileInput } from "@autointern/domain";

const resumeRules = [
  "Write an ATS-safe internship resume that fits on a single page.",
  "Never use tables, columns, text boxes, images, icons, or decorative glyphs.",
  "Use truthful content only. Do not invent experience, metrics, technologies, titles, dates, or awards.",
  "Never output empty strings for required fields.",
  "If a section has no real data, return an empty array for that section instead of placeholder items.",
  "Prioritize evidence that matches the target internship description.",
  "Keep bullets sharp, action-oriented, and impact-first.",
  "Quantify outcomes only when the source profile explicitly supports them.",
  "Drop weaker or redundant bullets instead of exceeding one page.",
  "Prefer standard sections such as Summary, Skills, Education, Experience, and Projects."
];

export function buildResumeMessages(profile: UserProfileInput, job: JobListingExtraction) {
  return {
    system: [
      "You are an elite resume writer for internship applications.",
      ...resumeRules,
      "Return only valid JSON.",
      "Use this exact resume schema and field names:",
      JSON.stringify(
        {
          name: "Avery Tan",
          headline: "Computer Science student seeking backend internships",
          contactLine: "Singapore | avery.tan@example.com | +65 9123 4567 | linkedin.com/in/avery-tan | github.com/averytan",
          summary: "Short summary tailored to the role.",
          skills: ["TypeScript", "React", "Node.js"],
          education: [
            {
              school: "National University of Singapore",
              degreeLine: "B.Comp. in Computer Science, May 2027",
              detailLine: "Relevant coursework: algorithms, databases, operating systems"
            }
          ],
          experience: [
            {
              company: "Example Company",
              roleLine: "Software Engineering Intern | Singapore | May 2025 - Aug 2025",
              bullets: [
                {
                  text: "Built an internal tool used by recruiters to review applications faster.",
                  priority: 2
                }
              ]
            }
          ],
          projects: [
            {
              title: "Job Search Automation Tool",
              subtitle: "TypeScript, Next.js, PostgreSQL",
              bullets: [
                {
                  text: "Built a workflow that tracks listings and generates tailored application materials.",
                  priority: 2
                }
              ]
            }
          ],
          extras: [
            {
              heading: "Additional",
              items: ["Open source contributions", "Hackathon finalist"]
            }
          ]
        },
        null,
        2
      )
      ,
      "Important validation rules:",
      "- education items require non-empty school and degreeLine",
      "- experience items require non-empty company, roleLine, and bullets",
      "- project items require non-empty title and bullets",
      "- if you do not have trustworthy data for a section, use [] for that section"
    ].join("\n"),
    user: [
      "Create a JSON resume specification tailored to this internship.",
      "Return only JSON that matches the exact schema and field names from the system instructions.",
      "",
      `Target job title: ${job.title}`,
      `Target company: ${job.company_name}`,
      `Target location: ${job.location || "Not specified"}`,
      `Relevant keywords: ${job.matching_keywords.join(", ") || "None"}`,
      "",
      "Job description:",
      job.job_description_markdown,
      "",
      "Candidate profile:",
      JSON.stringify(profile, null, 2),
      "",
      "Hard constraints:",
      ...resumeRules.map((rule) => `- ${rule}`)
    ].join("\n")
  };
}

export function buildCoverLetterMessages(profile: UserProfileInput, job: JobListingExtraction) {
  return {
    system: [
      "You write concise, credible cover letters for internship applications.",
      "Use a professional tone, keep it under 300 words, and do not invent facts.",
      "Return valid JSON only.",
      "Return exactly one JSON object with this shape:",
      JSON.stringify(
        {
          coverLetter: "Short tailored cover letter text."
        },
        null,
        2
      )
    ].join("\n"),
    user: [
      `Write a tailored cover letter for ${job.company_name} and the ${job.title} role.`,
      "Use the candidate profile below and highlight relevant overlap with the job description.",
      "Return only the JSON object described in the system instructions.",
      "",
      "Candidate profile:",
      JSON.stringify(profile, null, 2),
      "",
      "Job description:",
      job.job_description_markdown
    ].join("\n")
  };
}

export function buildAnswerMessages(profile: UserProfileInput, job: JobListingExtraction) {
  return {
    system: [
      "You produce structured application answers grounded in the candidate profile.",
      "Reuse only truthful details. Keep answers concise but usable in a real ATS workflow.",
      "Return valid JSON only.",
      "The final JSON object must include top-level fields: resume, coverLetter, screeningAnswers, essayResponses."
    ].join("\n"),
    user: [
      "Generate reusable screening answers and any likely long-form responses needed for this internship application.",
      "Return the full packet JSON object, not only the answers.",
      "",
      "Candidate profile:",
      JSON.stringify(profile, null, 2),
      "",
      "Job description:",
      job.job_description_markdown
    ].join("\n")
  };
}

export function getResumeBestPractices(): string[] {
  return [...resumeRules];
}
