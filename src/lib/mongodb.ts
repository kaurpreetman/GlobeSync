import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error("Please define MONGO_URI in .env");

let cached = (global as any).mongoose;

if (!cached) cached = (global as any).mongoose = { conn: null, promise: null };

async function connectDb() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    // Clear all cached models to ensure schema changes are picked up
    Object.keys(mongoose.models).forEach(modelName => {
      delete mongoose.models[modelName];
    });
    
    cached.promise = mongoose.connect(MONGO_URI).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDb;
