import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "@/lib/mail";

connectDb();

export async function POST(req: NextRequest) {
  const { action, email, password, name, confirmPassword, code } = await req.json();

  try {
    // ---------------- SIGNUP ----------------
    if (action === "signup") {
      if (!name || !email || !password || !confirmPassword)
        return NextResponse.json({ error: "All fields are required" }, { status: 400 });

      if (password !== confirmPassword)
        return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });

      const existing = await User.findOne({ email });
      if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 400 });

      const hashed = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await User.create({ name, email, password: hashed, otp, otpExpiry });
      await sendOtpEmail(email, otp);

      return NextResponse.json({ message: "OTP sent to email. Please verify." });
    }

    // ---------------- VERIFY OTP ----------------
    if (action === "verify-otp") {
      const user = await User.findOne({ email });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      if (user.otp !== code) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
      if (user.otpExpiry! < new Date()) return NextResponse.json({ error: "OTP expired" }, { status: 400 });

      user.isVerified = true;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET!, {
        expiresIn: "7d",
      });

      return NextResponse.json({ message: "Verified successfully", token });
    }

    // ---------------- LOGIN ----------------
    if (action === "login") {
      const user = await User.findOne({ email });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (!user.isVerified) return NextResponse.json({ error: "Email not verified" }, { status: 400 });

      const match = await bcrypt.compare(password!, user.password!);
      if (!match) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });

      const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET!, {
        expiresIn: "7d",
      });

      return NextResponse.json({ message: "Logged in successfully", token });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
