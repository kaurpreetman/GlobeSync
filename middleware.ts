import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth", // Redirect to your login page
  },
});

export const config = {
  matcher: [
    "/explore/:path*",   // protect all explore routes
    "/compare/:path*",   // protect compare page
    "/dashboard/:path*", // protect dashboard
    "/planning/:path*",  // protect planning page for consistency
  ],
};
