import { getEnv } from "@autointern/config";
import {
  applicationExecutionResultSchema,
  jobListingBatchResultSchema,
  type ApplicationExecutionResult,
  type JobListingExtraction,
  type JobSourceInput,
  type ResumeSpec,
  type SubmissionMode,
  type UserProfileInput
} from "@autointern/domain";
import { z } from "zod";

const tinyFishRunSchema = z.object({
  run_id: z.string(),
  error: z.unknown().nullable().optional()
});

const tinyFishRunStatusSchema = z.object({
  run_id: z.string(),
  status: z.string(),
  result: z.unknown().optional(),
  error: z.unknown().nullable().optional()
});

export type TinyFishRunStatus = z.infer<typeof tinyFishRunStatusSchema>;

export type StartRunInput = {
  url: string;
  goal: string;
  browserProfile?: "lite" | "stealth";
  countryCode?: string;
};

export class TinyFishClient {
  constructor(
    private readonly config?: {
      baseUrl?: string;
      apiKey?: string;
    }
  ) {}

  async startExtractionRun(input: StartRunInput): Promise<string> {
    const run = await this.post("/automation/run-async", {
      url: input.url,
      goal: input.goal,
      browser_profile: input.browserProfile ?? "lite",
      proxy_config: input.countryCode
        ? {
            enabled: true,
            country_code: input.countryCode
          }
        : undefined
    });

    return tinyFishRunSchema.parse(run).run_id;
  }

  async startApplyRun(input: StartRunInput): Promise<string> {
    const run = await this.post("/automation/run-async", {
      url: input.url,
      goal: input.goal,
      browser_profile: input.browserProfile ?? "stealth",
      proxy_config: input.countryCode
        ? {
            enabled: true,
            country_code: input.countryCode
          }
        : undefined
    });

    return tinyFishRunSchema.parse(run).run_id;
  }

  async pollRun(runId: string): Promise<TinyFishRunStatus> {
    const response = await this.get(`/runs/${runId}`);
    return tinyFishRunStatusSchema.parse(response);
  }

  async waitForCompletion(runId: string, timeoutMs = 280_000): Promise<TinyFishRunStatus> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const status = await this.pollRun(runId);
      if (["COMPLETED", "FAILED", "CANCELLED"].includes(status.status)) {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, 4_000));
    }

    throw new Error(`TinyFish run ${runId} timed out.`);
  }

  buildExtractionGoal(jobSource: Pick<JobSourceInput, "keywords" | "locations" | "internshipOnly" | "provider">): string {
    const filters = [
      jobSource.internshipOnly ? "Keep only internship, intern, co-op, or student roles." : "Include all visible roles.",
      jobSource.keywords.length > 0 ? `Prefer roles that mention: ${jobSource.keywords.join(", ")}.` : "",
      jobSource.locations.length > 0 ? `Prefer roles in: ${jobSource.locations.join(", ")}.` : ""
    ].filter(Boolean);

    return [
      "Extract internship job listings from the current ATS page.",
      "Close cookie or consent banners before extracting.",
      "Scroll enough to load all visible roles on the current page.",
      "Do not open unrelated marketing pages or external links.",
      ...filters,
      "",
      "For each matching listing, extract ONLY:",
      "- external_id",
      "- title",
      "- company_name",
      "- location",
      "- internship_relevance_score from 0 to 1",
      "- canonical_application_url",
      "- job_description_markdown",
      "- matching_keywords as an array",
      "- compensation_hint",
      "",
      "If a role is clearly not an internship, skip it.",
      "If a role detail page must be opened to capture the description, open it and return to continue extracting only if the page makes that possible quickly.",
      "Stop when the current page is fully processed or a login wall blocks access.",
      "Return JSON matching this exact structure:",
      JSON.stringify(
        {
          listings: [
            {
              external_id: "12345",
              title: "Software Engineering Intern",
              company_name: "Example Company",
              location: "San Francisco, CA",
              internship_relevance_score: 0.97,
              canonical_application_url: "https://example.com/jobs/software-engineering-intern",
              job_description_markdown: "# Software Engineering Intern\nResponsibilities...",
              matching_keywords: ["software", "intern", "backend"],
              compensation_hint: "$35/hour"
            }
          ],
          next_page_url: null,
          exhausted: true
        },
        null,
        2
      )
    ].join("\n");
  }

  buildApplyGoal({
    job,
    profile,
    submissionMode,
    resumeUrl,
    coverLetterUrl,
    screeningAnswers,
    essayResponses,
    credentialContext
  }: {
    job: JobListingExtraction;
    profile: UserProfileInput;
    submissionMode: SubmissionMode;
    resumeUrl: string;
    coverLetterUrl?: string;
    screeningAnswers: Array<{ question: string; answer: string }>;
    essayResponses: Array<{ question: string; answer: string }>;
    credentialContext?: { username?: string; password?: string; label?: string };
  }): string {
    const submitInstruction =
      submissionMode === "AUTO_SUBMIT"
        ? "Submit the application once all required fields and uploads are complete."
        : "Do NOT submit immediately. Stop on the final review page or the last pre-submit step and confirm readiness.";

    return [
      `Complete the ATS application workflow for ${job.title} at ${job.company_name}.`,
      "",
      "1. If a login page appears and credentials are provided below, log in first.",
      "2. Navigate to the application form for the current role.",
      "3. Fill all required fields using the candidate profile below.",
      "4. When a resume upload field appears, upload the resume from this URL:",
      resumeUrl,
      coverLetterUrl
        ? `5. If a cover letter is requested, use the cover letter from this URL:\n${coverLetterUrl}`
        : "5. If a cover letter is requested, skip only if the field is optional.",
      "6. Use the structured answers below for screening questions and essay prompts.",
      `7. ${submitInstruction}`,
      "8. If a CAPTCHA, MFA challenge, broken uploader, session reset, or unsupported verification step appears, stop and report manual_action_required.",
      "9. Take note of any confirmation message or application reference number shown.",
      "",
      "Candidate profile:",
      JSON.stringify(profile, null, 2),
      "",
      credentialContext
        ? `Credential context:\n${JSON.stringify(
            {
              label: credentialContext.label ?? "Stored credential",
              username: credentialContext.username ?? "",
              password: credentialContext.password ?? ""
            },
            null,
            2
          )}`
        : "Credential context: none",
      "",
      "Structured screening answers:",
      JSON.stringify(screeningAnswers, null, 2),
      "",
      "Essay responses:",
      JSON.stringify(essayResponses, null, 2),
      "",
      "Return JSON matching this exact structure:",
      JSON.stringify(
        {
          submitted: submissionMode === "AUTO_SUBMIT",
          final_status: submissionMode === "AUTO_SUBMIT" ? "success" : "manual_action_required",
          confirmation_message: "Application submitted successfully",
          verification_required: null,
          screenshots: ["https://example.com/screenshot-1.png"],
          notes: ["Filled all required fields."]
        },
        null,
        2
      )
    ].join("\n");
  }

  normalizeExtractionResult(result: unknown): { listings: JobListingExtraction[]; exhausted: boolean; nextPageUrl?: string | null } {
    const parsed = jobListingBatchResultSchema.parse(result);
    return {
      listings: parsed.listings,
      exhausted: parsed.exhausted,
      nextPageUrl: parsed.next_page_url ?? null
    };
  }

  normalizeApplicationResult(result: unknown): ApplicationExecutionResult {
    return applicationExecutionResultSchema.parse(result);
  }

  private async get(path: string): Promise<unknown> {
    const env = getEnv();
    const response = await fetch(`${(this.config?.baseUrl ?? env.TINYFISH_BASE_URL).replace(/\/$/, "")}${path}`, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config?.apiKey ?? env.TINYFISH_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`TinyFish request failed with status ${response.status}`);
    }

    return response.json();
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const env = getEnv();
    const response = await fetch(`${(this.config?.baseUrl ?? env.TINYFISH_BASE_URL).replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config?.apiKey ?? env.TINYFISH_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`TinyFish request failed with status ${response.status}`);
    }

    return response.json();
  }
}

export function materializeResumeProfile(profile: UserProfileInput, resume: ResumeSpec): UserProfileInput {
  return {
    ...profile,
    headline: resume.headline
  };
}
