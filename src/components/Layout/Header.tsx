"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

const Header = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Explore", path: "/explore", protected: true },
    { name: "Trips", path: "/trips", protected: true },
    { name: "Dashboard", path: "/dashboard", protected: true },
  ];

  const handleNavClick = (itemPath: string, isProtected?: boolean) => {
    if (isProtected && !session) {
      router.push(`/auth?callbackUrl=${itemPath}`);
    } else {
      router.push(itemPath);
    }
  };

  const handleUserClick = () => {
    if (session) {
      if (confirm("Logout?")) signOut({ callbackUrl: "/" });
    } else {
      router.push("/auth");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <div className="h-8 w-8 rounded-lg bg-travel-blue flex items-center justify-center">
            <span className="text-white font-bold text-lg">Gs</span>
          </div>
          <span className="text-xl font-bold">GlobeSync</span>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path, item.protected)}
              className={cn(
                "text-sm font-medium transition-colors hover:text-travel-blue",
                pathname === item.path ? "text-travel-blue" : "text-muted-foreground"
              )}
            >
              {item.name}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          {session && <span className="text-sm font-medium mr-2">{session.user?.name}</span>}
          <Button variant="ghost" size="icon" onClick={handleUserClick}>
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
