import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const jobs = await prisma.jobListing.findMany({
      where: { userId: user.id, status: { not: "SKIPPED" } },
      select: {
        id: true,
        title: true,
        companyName: true,
        location: true,
        status: true,
        internshipScore: true
      },
      orderBy: { discoveredAt: "desc" },
      take: 50
    });

    return NextResponse.json(jobs);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized." }, { status: 401 });
  }
}
