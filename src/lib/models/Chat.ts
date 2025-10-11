// lib/models/Chat.ts
import mongoose, { Schema, model, models, Document, Model } from "mongoose";

export interface IMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  suggested_responses?: string[];
}

export interface IChat extends Document {
  user: string; // Changed from ObjectId to string for OAuth user IDs
  title: string;
  messages: IMessage[];
  basic_info?: Record<string, any>;
  route_data?: Record<string, any>;
  tool_data?: Record<string, any>; // For storing budget, weather, transportation, calendar data
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
    user: { type: String, required: true, index: true }, // Changed from ObjectId to String for OAuth user IDs
    title: { type: String, required: true },
    messages: [messageSchema],
    basic_info: { type: Object },
    route_data: { type: Object, default: {} },
    tool_data: { type: Object, default: {} }, // Store budget, weather, transport, calendar data
    map_center: { type: [Number], default: [0, 0] },
  },
  { timestamps: true }
);

// Aggressive cache clearing to ensure schema changes are applied
try {
  mongoose.deleteModel('Chat');
} catch (e) {
  // Model doesn't exist yet, that's fine
}

const Chat: Model<IChat> = model<IChat>("Chat", chatSchema);
export default Chat;
