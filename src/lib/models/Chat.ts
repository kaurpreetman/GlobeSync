// lib/models/Chat.ts
import mongoose, { Schema, model, models, Document, Model } from "mongoose";

export interface IMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  suggested_responses?: string[];
}

export interface IChat extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  basic_info?: Record<string, any>;
  route_data?: Record<string, any>; // ✅ Add this
  map_center?: [number, number];
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    suggested_responses: [String],
  },
  { _id: false }
);

const chatSchema = new Schema<IChat>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    messages: [messageSchema],
    basic_info: { type: Object },
    route_data: { type: Object, default: {} }, // ✅ Add this
    map_center: { type: [Number], default: [0, 0] },
  },
  { timestamps: true }
);

const Chat: Model<IChat> = models.Chat || model<IChat>("Chat", chatSchema);
export default Chat;
