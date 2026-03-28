import { z } from "zod";

export const queueNames = {
  discoverJobs: "discover-jobs",
  generatePacket: "generate-packet",
  submitApplication: "submit-application"
} as const;

export const submissionModes = ["APPROVAL_FIRST", "AUTO_SUBMIT"] as const;
export const submissionModeSchema = z.enum(submissionModes);
export type SubmissionMode = z.infer<typeof submissionModeSchema>;

export const jobSourceProviders = ["GREENHOUSE", "LEVER", "ASHBY", "WORKABLE", "GENERIC_ATS"] as const;
export const jobSourceProviderSchema = z.enum(jobSourceProviders);
export type JobSourceProvider = z.infer<typeof jobSourceProviderSchema>;

export const jobListingStatuses = [
  "DISCOVERED",
  "MATCHED",
  "SKIPPED",
  "PACKET_QUEUED",
  "READY_FOR_REVIEW",
  "APPLYING",
  "APPLIED",
  "MANUAL_ACTION_REQUIRED",
  "FAILED"
] as const;
export const jobListingStatusSchema = z.enum(jobListingStatuses);

export const applicationRunStatuses = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "MANUAL_ACTION_REQUIRED",
  "CANCELLED"
] as const;
export const applicationRunStatusSchema = z.enum(applicationRunStatuses);

export const resumeBulletSchema = z.object({
  text: z.string().min(1),
  priority: z.number().int().min(1).max(5).default(3)
});

export const experienceItemSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1).optional(),
  bullets: z.array(resumeBulletSchema).min(1)
});

export const educationItemSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  location: z.string().optional(),
  graduationDate: z.string().min(1),
  highlights: z.array(z.string()).default([])
});

export const projectItemSchema = z.object({
  name: z.string().min(1),
  link: z.string().url().optional(),
  summary: z.string().min(1),
  technologies: z.array(z.string()).default([]),
  bullets: z.array(resumeBulletSchema).min(1)
});

export const userProfileInputSchema = z.object({
  fullName: z.string().min(2),
  headline: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  currentLocation: z.string().min(2),
  workAuthorization: z.string().min(2),
  visaStatus: z.string().optional().default(""),
  graduationDate: z.string().optional().default(""),
  targetRoles: z.array(z.string()).default([]),
  preferredLocations: z.array(z.string()).default([]),
  salaryExpectation: z.string().optional().default(""),
  availability: z.string().optional().default(""),
  summary: z.string().min(10),
  skills: z.array(z.string()).default([]),
  screeningFacts: z.array(z.string()).default([]),
  education: z.array(educationItemSchema).default([]),
  experiences: z.array(experienceItemSchema).default([]),
  projects: z.array(projectItemSchema).default([])
});
export type UserProfileInput = z.infer<typeof userProfileInputSchema>;

export const providerCredentialInputSchema = z.object({
  provider: z.string().min(2),
  label: z.string().min(2),
  username: z.string().optional().default(""),
  secret: z.string().min(1),
  metadata: z.record(z.string(), z.string()).default({})
});
export type ProviderCredentialInput = z.infer<typeof providerCredentialInputSchema>;

export const searchPresetInputSchema = z.object({
  name: z.string().min(2),
  companies: z.array(z.string()).default([]),
  keywords: z.array(z.string()).min(1),
  locations: z.array(z.string()).default([]),
  internshipOnly: z.boolean().default(true),
  maxDailyApplications: z.number().int().min(1).max(100).default(10)
});
export type SearchPresetInput = z.infer<typeof searchPresetInputSchema>;

export const jobSourceInputSchema = z.object({
  name: z.string().min(2),
  provider: jobSourceProviderSchema,
  sourceUrl: z.string().url(),
  keywords: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  countryCode: z.string().length(2).optional(),
  internshipOnly: z.boolean().default(true),
  maxDailyApplications: z.number().int().min(1).max(100).default(10),
  searchPresetId: z.string().optional()
});
export type JobSourceInput = z.infer<typeof jobSourceInputSchema>;

export const screeningAnswerSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.7)
});

export const resumeSectionSchema = z.object({
  heading: z.string().min(1),
  items: z.array(z.string()).default([])
});

export const resumeSpecSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  contactLine: z.string().min(1),
  summary: z.string().min(1),
  skills: z.array(z.string()).default([]),
  education: z.array(
    z.object({
      school: z.string().min(1),
      degreeLine: z.string().min(1),
      detailLine: z.string().optional()
    })
  ),
  experience: z.array(
    z.object({
      company: z.string().min(1),
      roleLine: z.string().min(1),
      bullets: z.array(resumeBulletSchema).min(1)
    })
  ),
  projects: z.array(
    z.object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      bullets: z.array(resumeBulletSchema).min(1)
    })
  ),
  extras: z.array(resumeSectionSchema).default([])
});
export type ResumeSpec = z.infer<typeof resumeSpecSchema>;

export const jobListingExtractionSchema = z.object({
  external_id: z.string().optional(),
  title: z.string().min(1),
  company_name: z.string().min(1),
  location: z.string().optional().default(""),
  internship_relevance_score: z.number().min(0).max(1),
  canonical_application_url: z.string().url(),
  job_description_markdown: z.string().min(1),
  matching_keywords: z.array(z.string()).default([]),
  compensation_hint: z.string().optional().default("")
});

export const jobListingBatchResultSchema = z.object({
  listings: z.array(jobListingExtractionSchema),
  next_page_url: z.string().url().nullable().optional(),
  exhausted: z.boolean().default(true)
});
export type JobListingExtraction = z.infer<typeof jobListingExtractionSchema>;

export const generatedPacketSchema = z.object({
  resume: resumeSpecSchema,
  coverLetter: z.string().min(1),
  screeningAnswers: z.array(screeningAnswerSchema).default([]),
  essayResponses: z.array(screeningAnswerSchema).default([])
});
export type GeneratedPacket = z.infer<typeof generatedPacketSchema>;

export const applicationExecutionResultSchema = z.object({
  submitted: z.boolean(),
  final_status: z.enum(["success", "manual_action_required", "failed"]),
  confirmation_message: z.string().nullable(),
  verification_required: z.string().nullable(),
  screenshots: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});
export type ApplicationExecutionResult = z.infer<typeof applicationExecutionResultSchema>;

export function mapExecutionResultToListingStatus(finalStatus: ApplicationExecutionResult["final_status"]) {
  switch (finalStatus) {
    case "success":
      return "APPLIED" as const;
    case "manual_action_required":
      return "MANUAL_ACTION_REQUIRED" as const;
    default:
      return "FAILED" as const;
  }
}
