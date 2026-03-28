import { NextResponse } from "next/server";
import { searchPresetInputSchema } from "@autointern/domain";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = searchPresetInputSchema.parse(await request.json());

    const preset = await prisma.searchPreset.create({
      data: {
        userId: user.id,
        ...payload
      }
    });

    return NextResponse.json(preset);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create search preset." },
      { status: 400 }
    );
  }
}
