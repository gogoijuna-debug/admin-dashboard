import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const assertAdmin = async (request: NextRequest) => {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length);
  const decoded = await adminAuth.verifyIdToken(token);
  const requesterDoc = await adminDb.collection("users").doc(decoded.uid).get();
  if (requesterDoc.data()?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return null;
};

export async function POST(request: NextRequest) {
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const authError = await assertAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { email, password, role, displayName, qualification, bio, imageUrl } = body as {
      email?: string;
      password?: string;
      role?: "admin" | "doctor" | "manager";
      displayName?: string;
      qualification?: string;
      bio?: string;
      imageUrl?: string;
    };

    if (!email || !password || !role || !displayName) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await adminDb.collection("users").where("email", "==", normalizedEmail).limit(1).get();
    if (!existingUser.empty) {
      return NextResponse.json({ error: "A staff account with this email already exists." }, { status: 409 });
    }

    const createdUser = await adminAuth.createUser({
      email: normalizedEmail,
      password,
      displayName: displayName.trim(),
    });

    await adminDb.collection("users").doc(createdUser.uid).set({
      email: normalizedEmail,
      role,
      displayName: displayName.trim(),
      qualification: role === "doctor" ? qualification?.trim() || "" : "",
      bio: role === "doctor" ? bio?.trim() || "" : "",
      imageUrl: imageUrl?.trim() || "",
      active: true,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ uid: createdUser.uid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const authError = await assertAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    if (!uid) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    await adminAuth.deleteUser(uid);
    await adminDb.collection("users").doc(uid).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}