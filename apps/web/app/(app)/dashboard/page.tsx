import { DashboardShell } from "../../../components/dashboard-shell";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const [user, profile, credentials, searchPresets, jobSources, jobs, applications] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        submissionMode: true
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
      orderBy: { createdAt: "desc" }
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
      orderBy: { updatedAt: "desc" }
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
      orderBy: { updatedAt: "desc" }
    }),
    prisma.jobListing.findMany({
      where: { userId: session.user.id, status: { not: "SKIPPED" } },
      select: {
        id: true,
        title: true,
        companyName: true,
        location: true,
        status: true,
        internshipScore: true
      },
      orderBy: { discoveredAt: "desc" },
      take: 25
    }),
    prisma.applicationPacket.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        createdAt: true,
        jobListing: {
          select: {
            title: true,
            companyName: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 25
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
        jobs,
        applications: applications.map((packet) => ({
          id: packet.id,
          title: packet.jobListing.title,
          companyName: packet.jobListing.companyName,
          status: packet.jobListing.status,
          createdAt: packet.createdAt.toISOString()
        }))
      }}
    />
  );
}
