import { DashboardShell } from "../../../components/dashboard-shell";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const [user, profile, credentials, searchPresets, jobSources, jobs, applications, runs] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true
      }
    }),
    prisma.userProfile.findUnique({
      where: { userId: session.user.id }
    }),
    prisma.providerCredential.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        label: true,
        username: true
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.searchPreset.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        keywords: true,
        locations: true,
        companies: true
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.jobSource.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        provider: true,
        sourceUrl: true,
        enabled: true
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.jobListing.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ["DISCOVERED", "MATCHED"]
        }
      },
      select: {
        id: true,
        title: true,
        companyName: true,
        location: true,
        status: true,
        internshipScore: true,
        canonicalApplicationUrl: true
      },
      orderBy: { discoveredAt: "desc" },
      take: 5
    }),
    prisma.jobListing.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ["PACKET_QUEUED", "READY_FOR_REVIEW", "FAILED"]
        }
      },
      select: {
        id: true,
        title: true,
        companyName: true,
        status: true,
        updatedAt: true,
        packet: {
          select: {
            id: true,
            createdAt: true,
            resumeObjectKey: true,
            coverLetterObjectKey: true
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.applicationRun.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        runType: true,
        status: true,
        tinyfishRunId: true,
        errorMessage: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        jobListing: {
          select: {
            title: true,
            companyName: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  return (
    <DashboardShell
      initialData={{
        user,
        profile,
        credentials,
        searchPresets,
        jobSources,
        jobs: jobs.map((job) => ({
          ...job,
          isSynthetic: job.canonicalApplicationUrl.endsWith("#discovery")
        })),
        applications: applications.map((listing) => ({
          id: listing.id,
          jobId: listing.id,
          packetId: listing.packet?.id ?? null,
          title: listing.title,
          companyName: listing.companyName,
          status: listing.status,
          hasMaterials: Boolean(listing.packet?.resumeObjectKey && listing.packet?.coverLetterObjectKey),
          createdAt: (listing.packet?.createdAt ?? listing.updatedAt).toISOString()
        })),
        runs: runs.map((run) => ({
          id: run.id,
          runType: run.runType,
          status: run.status,
          tinyfishRunId: run.tinyfishRunId,
          errorMessage: run.errorMessage,
          createdAt: run.createdAt.toISOString(),
          startedAt: run.startedAt?.toISOString() ?? null,
          finishedAt: run.finishedAt?.toISOString() ?? null,
          jobTitle: run.jobListing.title,
          companyName: run.jobListing.companyName
        }))
      }}
    />
  );
}
