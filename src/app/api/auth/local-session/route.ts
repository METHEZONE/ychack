import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "forage_session";
const MAX_AGE = 90 * 24 * 60 * 60; // 90 days

// POST: Set session cookie
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, sessionToken } = body;

  if (!userId || !sessionToken) {
    return NextResponse.json({ error: "Missing userId or sessionToken" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify({ userId, sessionToken }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}

// GET: Read session cookie
export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) {
    return NextResponse.json({ userId: null, sessionToken: null });
  }

  try {
    const { userId, sessionToken } = JSON.parse(raw);
    return NextResponse.json({ userId, sessionToken });
  } catch {
    return NextResponse.json({ userId: null, sessionToken: null });
  }
}

// DELETE: Clear session cookie
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
