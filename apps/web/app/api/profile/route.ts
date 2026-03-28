import { NextResponse } from "next/server";
import { userProfileInputSchema } from "@autointern/domain";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
  return PUT(request);
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const payload = userProfileInputSchema.parse(await request.json());

    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...payload,
        skills: payload.skills,
        screeningFacts: payload.screeningFacts,
        education: payload.education,
        experiences: payload.experiences,
        projects: payload.projects
      },
      update: {
        ...payload,
        skills: payload.skills,
        screeningFacts: payload.screeningFacts,
        education: payload.education,
        experiences: payload.experiences,
        projects: payload.projects
      }
    });

    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save profile." },
      { status: 400 }
    );
  }
}
