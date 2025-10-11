
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Providers from "./providers";
import LayoutWithHeader from "./layout-with-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GlobeSync - Smart Travel Planner",
  description:
    "AI-powered travel planning with smart itineraries, cost analysis, weather forecasts, and event discovery. Plan your perfect trip with Webster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        
        <Providers>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <LayoutWithHeader>{children}</LayoutWithHeader>
          </TooltipProvider>
        </Providers>
   
      </body>
    </html>
  );
}
