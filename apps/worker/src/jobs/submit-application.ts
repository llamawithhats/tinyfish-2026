import { ApplicationRunType, JobListingStatus } from "@prisma/client";
import { decryptSecret } from "@autointern/config";
import { getSignedDownloadUrl } from "@autointern/storage";
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

    const runId = await tinyFish.startApplyRun({
      url: packet.jobListing.canonicalApplicationUrl,
      goal: tinyFish.buildApplyGoal({
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
        credentialContext: credential
          ? {
              label: credential.label,
              username: credential.username ?? "",
              password: decryptSecret(credential.encryptedSecret)
            }
          : undefined
      }),
      browserProfile: "stealth",
      countryCode: packet.jobListing.location?.includes("Singapore") ? "SG" : undefined
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
    await prisma.jobListing.update({
      where: { id: packet.jobListingId },
      data: {
        status: JobListingStatus.MANUAL_ACTION_REQUIRED
      }
    });

    await prisma.applicationRun.update({
      where: { id: run.id },
      data: {
        status: "MANUAL_ACTION_REQUIRED",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown submission failure."
      }
    });
    throw error;
  }
}
