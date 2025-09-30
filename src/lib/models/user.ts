// lib/models/user.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";

export interface IUser {
  _id?: ObjectId;
  fullName: string;
  email: string;
  password: string; 
  createdAt?: Date;
}

const COLLECTION = "users";

export async function findUserByEmail(email: string) {
  const client = await clientPromise;
  const users = client.db().collection<IUser>(COLLECTION);
  return users.findOne({ email: email.toLowerCase() });
}

export async function createUser(data: { fullName: string; email: string; password: string }) {
  const client = await clientPromise;
  const users = client.db().collection(COLLECTION);

  const now = new Date();
  const userDoc: IUser = {
    fullName: data.fullName,
    email: data.email.toLowerCase(),
    password: data.password, 
    createdAt: now,
  };

  const result = await users.insertOne(userDoc);
  return { ...userDoc, _id: result.insertedId };
}

export async function verifyPassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed);
}

export async function hashPassword(plain: string) {
  const saltRounds = 10;
  return bcrypt.hash(plain, saltRounds);
}
