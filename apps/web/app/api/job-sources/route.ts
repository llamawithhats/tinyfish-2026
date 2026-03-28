import { NextResponse } from "next/server";
import { jobSourceInputSchema } from "@autointern/domain";
import { requireUser } from "../../../lib/auth";
import { discoverJobsQueue } from "../../../lib/queues";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = jobSourceInputSchema.parse(await request.json());

    const source = await prisma.jobSource.create({
      data: {
        userId: user.id,
        ...payload
      },
      select: {
        id: true,
        name: true,
        provider: true,
        sourceUrl: true,
        enabled: true
      }
    });

    await discoverJobsQueue.add(
      "discover-job-source",
      { jobSourceId: source.id },
      {
        removeOnComplete: 100
      }
    );

    return NextResponse.json(source);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create job source." },
      { status: 400 }
    );
  }
}
