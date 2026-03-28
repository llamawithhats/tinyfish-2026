import { ApplicationRunType, JobListingStatus } from "@prisma/client";
import { decryptSecret } from "@autointern/config";
import { getSignedDownloadUrl, isPubliclyReachableUrl } from "@autointern/storage";
import { TinyFishClient } from "@autointern/tinyfish";
import { mapExecutionResultToListingStatus } from "@autointern/domain";
import { prisma } from "../prisma";

const tinyFish = new TinyFishClient();

export async function submitApplication(applicationPacketId: string) {
  const packet = await prisma.applicationPacket.findUnique({
    where: { id: applicationPacketId },
    include: {
      user: {
        include: {
          profile: true,
          providerCredentials: true
        }
      },
      jobListing: true
    }
  });

  if (!packet || !packet.user.profile) {
    throw new Error("Application packet and user profile are required.");
  }

  const credential = packet.user.providerCredentials.find(
    (item) => item.provider.toLowerCase() === packet.jobListing.provider.toLowerCase()
  );

  const run = await prisma.applicationRun.create({
    data: {
      userId: packet.userId,
      jobListingId: packet.jobListingId,
      applicationPacketId: packet.id,
      runType: ApplicationRunType.APPLY,
      status: "RUNNING",
      startedAt: new Date()
    }
  });

  try {
    const resumeUrl = await getSignedDownloadUrl(packet.resumeObjectKey);
    const coverLetterUrl = packet.coverLetterObjectKey ? await getSignedDownloadUrl(packet.coverLetterObjectKey) : undefined;

    if (!isPubliclyReachableUrl(resumeUrl) || (coverLetterUrl && !isPubliclyReachableUrl(coverLetterUrl))) {
      throw new Error(
        "Apply requires publicly reachable resume and cover-letter URLs. Configure STORAGE_PUBLIC_ENDPOINT to a host TinyFish can access instead of localhost storage."
      );
    }

    const countryCode = packet.jobListing.location?.includes("Singapore") ? "SG" : undefined;
    const credentialContext = credential
      ? {
          label: credential.label,
          username: credential.username ?? "",
          password: decryptSecret(credential.encryptedSecret)
        }
      : undefined;
    const goal = tinyFish.buildApplyGoal({
      job: {
        external_id: packet.jobListing.externalId ?? undefined,
        title: packet.jobListing.title,
        company_name: packet.jobListing.companyName,
        location: packet.jobListing.location ?? "",
        internship_relevance_score: packet.jobListing.internshipScore,
        canonical_application_url: packet.jobListing.canonicalApplicationUrl,
        job_description_markdown: packet.jobListing.descriptionMarkdown,
        matching_keywords: packet.jobListing.matchingKeywords,
        compensation_hint: packet.jobListing.compensationHint ?? ""
      },
      profile: {
        ...packet.user.profile,
        skills: packet.user.profile.skills,
        screeningFacts: packet.user.profile.screeningFacts,
        education: packet.user.profile.education,
        experiences: packet.user.profile.experiences,
        projects: packet.user.profile.projects
      } as never,
      submissionMode: packet.user.submissionMode,
      resumeUrl,
      coverLetterUrl,
      screeningAnswers: packet.screeningAnswers as Array<{ question: string; answer: string }>,
      essayResponses: packet.essayResponses as Array<{ question: string; answer: string }>,
      credentialContext
    });

    console.info("TinyFish apply request", {
      jobListingId: packet.jobListingId,
      applicationPacketId: packet.id,
      url: packet.jobListing.canonicalApplicationUrl,
      browserProfile: "stealth",
      countryCode: countryCode ?? null,
      hasResumeUrl: Boolean(resumeUrl),
      hasCoverLetterUrl: Boolean(coverLetterUrl),
      credentialIncluded: Boolean(credentialContext),
      credentialLabel: credentialContext?.label ?? null,
      goalLength: goal.length,
      goalPreview: goal.slice(0, 600)
    });

    const runId = await tinyFish.startApplyRun({
      url: packet.jobListing.canonicalApplicationUrl,
      goal,
      browserProfile: "stealth",
      countryCode
    });

    const finalStatus = await tinyFish.waitForCompletion(runId);
    const normalized = tinyFish.normalizeApplicationResult(finalStatus.result);
    const targetStatus = mapExecutionResultToListingStatus(normalized.final_status);

    await prisma.jobListing.update({
      where: { id: packet.jobListingId },
      data: {
        status: JobListingStatus[targetStatus]
      }
    });

    await prisma.applicationRun.update({
      where: { id: run.id },
      data: {
        tinyfishRunId: runId,
        status: normalized.final_status === "success" ? "COMPLETED" : normalized.final_status === "manual_action_required" ? "MANUAL_ACTION_REQUIRED" : "FAILED",
        finishedAt: new Date(),
        screenshotKeys: normalized.screenshots,
        result: normalized
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown submission failure.";
    const needsManualAction =
      typeof message === "string" &&
      /manual_action_required|captcha|mfa|multi-factor|verification|required verification|unsupported verification|login wall/i.test(message);

    await prisma.jobListing.update({
      where: { id: packet.jobListingId },
      data: {
        status: needsManualAction ? JobListingStatus.MANUAL_ACTION_REQUIRED : JobListingStatus.FAILED
      }
    });

    await prisma.applicationRun.update({
      where: { id: run.id },
      data: {
        status: needsManualAction ? "MANUAL_ACTION_REQUIRED" : "FAILED",
        finishedAt: new Date(),
        errorMessage: message
      }
    });
    throw error;
  }
}
