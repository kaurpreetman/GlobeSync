import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
 connectDb();

export async function POST(req: NextRequest) {
  const { userId, title } = await req.json();

  try {
    const chat = await Chat.create({
      user: userId,
      title: title || "New Chat",
      messages: [],
    });
console.log(chat);
    return NextResponse.json(chat);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
