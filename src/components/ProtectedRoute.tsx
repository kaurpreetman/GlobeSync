"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // wait until session loads
    if (!session) {
      router.replace("/auth"); // redirect immediately if not logged in
    }
  }, [session, status, router]);

  if (status === "loading" || !session) return null; // optional: loading spinner

  return <>{children}</>;
};

export default ProtectedRoute;
