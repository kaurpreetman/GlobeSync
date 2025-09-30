"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace(`/auth?callbackUrl=${pathname}`);
    }
  }, [session, status, router, pathname]);

  if (status === "loading" || !session) return null; // optional: loading spinner

  return <>{children}</>;
};

export default ProtectedRoute;
