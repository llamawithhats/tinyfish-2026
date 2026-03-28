import { ApplicationRunType, JobListingStatus } from "@prisma/client";
import { TinyFishClient } from "@autointern/tinyfish";
import { prisma } from "../prisma";

const tinyFish = new TinyFishClient();

export async function discoverJobsForSource(jobSourceId: string) {
  const source = await prisma.jobSource.findUnique({
    where: { id: jobSourceId },
    include: { user: { include: { profile: true } } }
  });

  if (!source || !source.enabled) {
    return;
  }

  const run = await prisma.applicationRun.create({
    data: {
      userId: source.userId,
      jobListingId: (
        await prisma.jobListing.upsert({
          where: {
            userId_canonicalApplicationUrl: {
              userId: source.userId,
              canonicalApplicationUrl: `${source.sourceUrl}#discovery`
            }
          },
          create: {
            userId: source.userId,
            jobSourceId: source.id,
            provider: source.provider,
            title: "Discovery Sweep",
            companyName: source.name,
            location: source.countryCode ?? "",
            descriptionMarkdown: "Synthetic listing used for discovery runs.",
            canonicalApplicationUrl: `${source.sourceUrl}#discovery`,
            matchingKeywords: source.keywords,
            internshipScore: 1,
            compensationHint: "",
            rawJson: { synthetic: true },
            status: JobListingStatus.MATCHED
          },
          update: {
            matchingKeywords: source.keywords
          }
        })
      ).id,
      runType: ApplicationRunType.DISCOVERY,
      status: "RUNNING",
      startedAt: new Date()
    }
  });

  try {
    const runId = await tinyFish.startExtractionRun({
      url: source.sourceUrl,
      goal: tinyFish.buildExtractionGoal({
        provider: source.provider,
        keywords: source.keywords,
        locations: source.locations,
        internshipOnly: source.internshipOnly
      }),
      browserProfile: "lite",
      countryCode: source.countryCode ?? undefined
    });

    const finalStatus = await tinyFish.waitForCompletion(runId);
    const normalized = tinyFish.normalizeExtractionResult(finalStatus.result);
    const records: Array<ReturnType<typeof prisma.jobListing.upsert>> = [];

    for (const listing of normalized.listings) {
      if (listing.internship_relevance_score < 0.55) {
        continue;
      }

      records.push(
        prisma.jobListing.upsert({
          where: {
            userId_canonicalApplicationUrl: {
              userId: source.userId,
              canonicalApplicationUrl: listing.canonical_application_url
            }
          },
          create: {
            userId: source.userId,
            jobSourceId: source.id,
            provider: source.provider,
            externalId: listing.external_id,
            title: listing.title,
            companyName: listing.company_name,
            location: listing.location,
            descriptionMarkdown: listing.job_description_markdown,
            canonicalApplicationUrl: listing.canonical_application_url,
            matchingKeywords: listing.matching_keywords,
            internshipScore: listing.internship_relevance_score,
            compensationHint: listing.compensation_hint,
            rawJson: listing,
            status: JobListingStatus.MATCHED
          },
          update: {
            title: listing.title,
            companyName: listing.company_name,
            location: listing.location,
            descriptionMarkdown: listing.job_description_markdown,
            matchingKeywords: listing.matching_keywords,
            internshipScore: listing.internship_relevance_score,
            compensationHint: listing.compensation_hint,
            rawJson: listing,
            status: JobListingStatus.MATCHED
          }
        })
      );
    }

    await Promise.all(records);
    await prisma.jobSource.update({
      where: { id: source.id },
      data: {
        lastScannedAt: new Date(),
        nextScanAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    await prisma.applicationRun.update({
      where: { id: run.id },
      data: {
        tinyfishRunId: runId,
        status: "COMPLETED",
        finishedAt: new Date(),
        result: normalized
      }
    });
  } catch (error) {
    await prisma.applicationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown discovery failure."
      }
    });
    throw error;
  }
}
