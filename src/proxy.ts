import NextAuth from "next-auth";
import type { NextFetchEvent, NextRequest } from "next/server";

import { authConfig } from "@/auth.config";

// Next 16's replacement for middleware.ts. It runs on the edge runtime, so it
// uses only the edge-safe half of the Auth.js config — the Credentials
// provider and Prisma stay out of this bundle.
const { auth } = NextAuth(authConfig);

// Returning nothing from the handler lets the `authorized` callback in
// auth.config.ts decide the request: allow it, or bounce to /login.
// The typed `event` parameter is what picks auth()'s middleware overload over
// its route-handler one.
const authProxy = auth((_request, _event: NextFetchEvent) => undefined);

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return authProxy(request, event);
}

export const config = {
  // Everything except Next internals, the auth endpoints, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
