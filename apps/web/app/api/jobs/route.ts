import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const jobs = await prisma.jobListing.findMany({
      where: {
        userId: user.id,
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
    });

    return NextResponse.json(
      jobs.map((job) => ({
        id: job.id,
        title: job.title,
        companyName: job.companyName,
        location: job.location,
        status: job.status,
        internshipScore: job.internshipScore,
        isSynthetic: job.canonicalApplicationUrl.endsWith("#discovery")
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized." }, { status: 401 });
  }
}
