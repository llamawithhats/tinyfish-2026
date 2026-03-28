import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const applications = await prisma.applicationPacket.findMany({
      where: { userId: user.id },
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
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(
      applications.map((packet) => ({
        id: packet.id,
        createdAt: packet.createdAt.toISOString(),
        title: packet.jobListing.title,
        companyName: packet.jobListing.companyName,
        status: packet.jobListing.status
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized." }, { status: 401 });
  }
}
