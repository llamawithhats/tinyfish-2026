import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const applications = await prisma.jobListing.findMany({
      where: {
        userId: user.id,
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
    });

    return NextResponse.json(
      applications.map((listing) => ({
        id: listing.id,
        jobId: listing.id,
        packetId: listing.packet?.id ?? null,
        createdAt: (listing.packet?.createdAt ?? listing.updatedAt).toISOString(),
        title: listing.title,
        companyName: listing.companyName,
        status: listing.status,
        hasMaterials: Boolean(listing.packet?.resumeObjectKey && listing.packet?.coverLetterObjectKey)
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized." }, { status: 401 });
  }
}
