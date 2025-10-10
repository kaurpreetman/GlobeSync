"use client";
import Header from "@/components/Layout/Header";
import { SessionProvider } from "next-auth/react";

export default function LayoutWithHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
  <SessionProvider>
     
        <div className="min-h-screen bg-background">
        
      <Header />
      <main>{children}</main>
   
    </div>
      
      </SessionProvider>
  );
}
