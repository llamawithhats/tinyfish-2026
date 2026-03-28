import { NextResponse } from "next/server";
import { encryptSecret } from "@autointern/config";
import { providerCredentialInputSchema } from "@autointern/domain";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = providerCredentialInputSchema.parse(await request.json());

    const credential = await prisma.providerCredential.create({
      data: {
        userId: user.id,
        provider: payload.provider.toUpperCase(),
        label: payload.label,
        username: payload.username || null,
        encryptedSecret: encryptSecret(payload.secret),
        metadata: payload.metadata
      },
      select: {
        id: true,
        provider: true,
        label: true,
        username: true
      }
    });

    return NextResponse.json(credential);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to store credential." },
      { status: 400 }
    );
  }
}
