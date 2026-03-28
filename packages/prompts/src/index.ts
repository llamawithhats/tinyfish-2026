import type { JobListingExtraction, UserProfileInput } from "@autointern/domain";

const resumeRules = [
  "Write an ATS-safe internship resume that fits on a single page.",
  "Never use tables, columns, text boxes, images, icons, or decorative glyphs.",
  "Use truthful content only. Do not invent experience, metrics, technologies, titles, dates, or awards.",
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
      ...resumeRules
    ].join("\n"),
    user: [
      "Create a JSON resume specification tailored to this internship.",
      "Return only JSON that matches the provided schema.",
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
    system:
      "You write concise, credible cover letters for internship applications. Use a professional tone, keep it under 300 words, and do not invent facts.",
    user: [
      `Write a tailored cover letter for ${job.company_name} and the ${job.title} role.`,
      "Use the candidate profile below and highlight relevant overlap with the job description.",
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
    system:
      "You produce structured application answers grounded in the candidate profile. Reuse only truthful details. Keep answers concise but usable in a real ATS workflow.",
    user: [
      "Generate reusable screening answers and any likely long-form responses needed for this internship application.",
      "Return JSON only.",
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
