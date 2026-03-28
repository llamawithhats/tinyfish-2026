import { NextResponse } from "next/server";
import { downloadObject } from "@autointern/storage";
import { requireUser } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

function getFilename(title: string, kind: "resume" | "cover-letter") {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return kind === "resume" ? `${safeTitle || "resume"}.pdf` : `${safeTitle || "cover-letter"}.txt`;
}

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string; kind: string }> }
) {
  try {
    const user = await requireUser();
    const { id, kind } = await context.params;

    if (kind !== "resume" && kind !== "cover-letter") {
      return NextResponse.json({ error: "Material not found." }, { status: 404 });
    }

    const listing = await prisma.jobListing.findFirst({
      where: {
        id,
        userId: user.id
      },
      select: {
        title: true,
        packet: {
          select: {
            resumeObjectKey: true,
            coverLetterObjectKey: true
          }
        }
      }
    });

    if (!listing?.packet) {
      return NextResponse.json({ error: "Generated materials not found." }, { status: 404 });
    }

    const objectKey = kind === "resume" ? listing.packet.resumeObjectKey : listing.packet.coverLetterObjectKey;

    if (!objectKey) {
      return NextResponse.json({ error: "Requested material is not available yet." }, { status: 404 });
    }

    const file = await downloadObject(objectKey);
    const headers = new Headers({
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${getFilename(listing.title, kind)}"`,
      "Cache-Control": "no-store"
    });

    if (file.contentLength) {
      headers.set("Content-Length", String(file.contentLength));
    }

    return new NextResponse(Buffer.from(file.body), {
      headers
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load generated material." },
      { status: 400 }
    );
  }
}
