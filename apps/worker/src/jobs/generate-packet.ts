import { ApplicationRunType, JobListingStatus } from "@prisma/client";
import { generateStructuredObject } from "@autointern/llm";
import { pruneResumeSpecToOnePage, renderPdfFromHtml, renderResumeHtml } from "@autointern/pdf";
import { buildAnswerMessages, buildCoverLetterMessages, buildResumeMessages } from "@autointern/prompts";
import { uploadBuffer, uploadJson } from "@autointern/storage";
import { generatedPacketSchema, resumeSpecSchema, type UserProfileInput } from "@autointern/domain";
import { prisma } from "../prisma";
import { submitApplicationQueue } from "../queues";

function coerceProfile(input: unknown): UserProfileInput {
  return input as UserProfileInput;
}

export async function generateApplicationPacket(jobListingId: string) {
  const listing = await prisma.jobListing.findUnique({
    where: { id: jobListingId },
    include: {
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!listing?.user.profile) {
    throw new Error("User profile is required before generating an application packet.");
  }

  const run = await prisma.applicationRun.create({
    data: {
      userId: listing.userId,
      jobListingId: listing.id,
      runType: ApplicationRunType.PACKET,
      status: "RUNNING",
      startedAt: new Date()
    }
  });

  const profile = coerceProfile({
    ...listing.user.profile,
    skills: listing.user.profile.skills,
    screeningFacts: listing.user.profile.screeningFacts,
    education: listing.user.profile.education,
    experiences: listing.user.profile.experiences,
    projects: listing.user.profile.projects
  });

  try {
    const resumePrompt = buildResumeMessages(profile, {
      external_id: listing.externalId ?? undefined,
      title: listing.title,
      company_name: listing.companyName,
      location: listing.location ?? "",
      internship_relevance_score: listing.internshipScore,
      canonical_application_url: listing.canonicalApplicationUrl,
      job_description_markdown: listing.descriptionMarkdown,
      matching_keywords: listing.matchingKeywords,
      compensation_hint: listing.compensationHint ?? ""
    });

    const resume = pruneResumeSpecToOnePage(
      await generateStructuredObject({
        schema: resumeSpecSchema,
        messages: [
          { role: "system", content: resumePrompt.system },
          { role: "user", content: resumePrompt.user }
        ]
      })
    );

    const coverLetterPrompt = buildCoverLetterMessages(profile, {
      external_id: listing.externalId ?? undefined,
      title: listing.title,
      company_name: listing.companyName,
      location: listing.location ?? "",
      internship_relevance_score: listing.internshipScore,
      canonical_application_url: listing.canonicalApplicationUrl,
      job_description_markdown: listing.descriptionMarkdown,
      matching_keywords: listing.matchingKeywords,
      compensation_hint: listing.compensationHint ?? ""
    });

    const answerPrompt = buildAnswerMessages(profile, {
      external_id: listing.externalId ?? undefined,
      title: listing.title,
      company_name: listing.companyName,
      location: listing.location ?? "",
      internship_relevance_score: listing.internshipScore,
      canonical_application_url: listing.canonicalApplicationUrl,
      job_description_markdown: listing.descriptionMarkdown,
      matching_keywords: listing.matchingKeywords,
      compensation_hint: listing.compensationHint ?? ""
    });

    const generatedPacket = await generateStructuredObject({
      schema: generatedPacketSchema,
      messages: [
        {
          role: "system",
          content: `${coverLetterPrompt.system}\n${answerPrompt.system}`
        },
        {
          role: "user",
          content: `${coverLetterPrompt.user}\n\n${answerPrompt.user}`
        }
      ]
    });

    const resumeHtml = renderResumeHtml(resume);
    const resumePdf = await renderPdfFromHtml(resumeHtml);
    const screeningAnswers = generatedPacket.screeningAnswers ?? [];
    const essayResponses = generatedPacket.essayResponses ?? [];
    const resumeKey = `users/${listing.userId}/packets/${listing.id}/resume.pdf`;
    const coverLetterKey = `users/${listing.userId}/packets/${listing.id}/cover-letter.txt`;
    const answersKey = `users/${listing.userId}/packets/${listing.id}/answers.json`;

    await uploadBuffer(resumeKey, resumePdf, "application/pdf");
    await uploadBuffer(coverLetterKey, Buffer.from(generatedPacket.coverLetter, "utf8"), "text/plain; charset=utf-8");
    await uploadJson(answersKey, {
      screeningAnswers: generatedPacket.screeningAnswers,
      essayResponses: generatedPacket.essayResponses
    });

    const packet = await prisma.applicationPacket.upsert({
      where: { jobListingId: listing.id },
      create: {
        userId: listing.userId,
        jobListingId: listing.id,
        resumeSpec: resume,
        coverLetterText: generatedPacket.coverLetter,
        screeningAnswers,
        essayResponses,
        resumeObjectKey: resumeKey,
        coverLetterObjectKey: coverLetterKey,
        answersObjectKey: answersKey
      },
      update: {
        resumeSpec: resume,
        coverLetterText: generatedPacket.coverLetter,
        screeningAnswers,
        essayResponses,
        resumeObjectKey: resumeKey,
        coverLetterObjectKey: coverLetterKey,
        answersObjectKey: answersKey
      }
    });

    await prisma.jobListing.update({
      where: { id: listing.id },
      data: {
        status: listing.user.submissionMode === "AUTO_SUBMIT" ? JobListingStatus.APPLYING : JobListingStatus.READY_FOR_REVIEW
      }
    });

    await prisma.applicationRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        result: {
          packetId: packet.id,
          resumeKey,
          coverLetterKey,
          answersKey
        }
      }
    });

    if (listing.user.submissionMode === "AUTO_SUBMIT") {
      await submitApplicationQueue.add(
        "submit-application",
        { applicationPacketId: packet.id },
        {
          removeOnComplete: 100,
          attempts: 2,
          backoff: {
            type: "exponential",
            delay: 5_000
          }
        }
      );
    }
  } catch (error) {
    await prisma.jobListing.update({
      where: { id: listing.id },
      data: {
        status: JobListingStatus.FAILED
      }
    });

    await prisma.applicationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown packet generation failure."
      }
    });
    throw error;
  }
}
