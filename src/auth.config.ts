import type { NextAuthConfig } from "next-auth";

/**
 * The edge-safe half of the Auth.js setup: no database imports, so it can run
 * inside middleware. The Credentials provider (which needs Prisma and bcrypt)
 * is added in src/auth.ts, which only ever runs in the Node.js runtime.
 */

const PUBLIC_ROUTES = ["/", "/login", "/signup"];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Stands in for Django's @login_required across every non-public route.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (PUBLIC_ROUTES.includes(pathname)) return true;
      return auth?.user != null;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = String(token.id);
        session.user.username = String(token.username ?? "");
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
