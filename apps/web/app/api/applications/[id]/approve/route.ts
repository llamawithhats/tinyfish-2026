import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Direct apply has been disabled. This workflow now generates materials only." },
    { status: 410 }
  );
}
