import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();

    const runs = await prisma.applicationRun.findMany({
      where: { userId: user.id },
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
    });

    return NextResponse.json(
      runs.map((run) => ({
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
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load runs." },
      { status: 400 }
    );
  }
}
