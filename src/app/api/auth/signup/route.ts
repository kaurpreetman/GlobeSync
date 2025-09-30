// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createUser, findUserByEmail, hashPassword } from "@/lib/models/user";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, password } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    // Check existing
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    const user = await createUser({ fullName, email, password: hashed });

    // remove password before returning any user data
    // (we're just returning a message here)
    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
