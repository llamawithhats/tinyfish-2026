import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { generatePacketQueue } from "../../../../../lib/queues";
import { prisma } from "../../../../../lib/prisma";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const listing = await prisma.jobListing.findFirst({
      where: { id, userId: user.id }
    });

    if (!listing) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    await prisma.jobListing.update({
      where: { id: listing.id },
      data: { status: "PACKET_QUEUED" }
    });

    await generatePacketQueue.add(
      "generate-application-packet",
      { jobListingId: listing.id },
      {
        removeOnComplete: 100,
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5_000
        }
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to queue packet generation." },
      { status: 400 }
    );
  }
}
