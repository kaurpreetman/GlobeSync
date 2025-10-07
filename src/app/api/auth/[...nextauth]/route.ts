// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { findUserByEmail, verifyPassword } from "@/lib/models/user";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const user = await findUserByEmail(credentials.email);
        if (!user) throw new Error("No user found with this email");

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid password");

        return {
          id: user._id.toString(), 
          email: user.email,
          name: user.fullName,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
    
      if (user) {
        token.id = user.id; 
      }
      return token;
    },
    async session({ session, token }) {
     
      if (session.user) {
        session.user.id = token.id as string; 
      }
      return session;
    },
  },
};




const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
