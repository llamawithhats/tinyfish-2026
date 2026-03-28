import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { hashPassword } from "../../../../lib/passwords";

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await request.json());
    const username = payload.username.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (existing) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        username,
        name: username,
        passwordHash: hashPassword(payload.password)
      },
      select: {
        id: true,
        username: true
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create account." },
      { status: 400 }
    );
  }
}
