import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { submitApplicationQueue } from "../../../../../lib/queues";
import { prisma } from "../../../../../lib/prisma";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const packet = await prisma.applicationPacket.findFirst({
      where: { id, userId: user.id },
      include: {
        jobListing: true
      }
    });

    if (!packet) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    await prisma.jobListing.update({
      where: { id: packet.jobListingId },
      data: { status: "APPLYING" }
    });

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to queue application submission." },
      { status: 400 }
    );
  }
}
