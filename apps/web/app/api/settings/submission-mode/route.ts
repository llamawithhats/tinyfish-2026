import { NextResponse } from "next/server";
import { submissionModeSchema } from "@autointern/domain";
import { requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = submissionModeSchema.parse((await request.json()).submissionMode);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { submissionMode: payload },
      select: {
        submissionMode: true
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update submission mode." },
      { status: 400 }
    );
  }
}
