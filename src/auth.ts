import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;

        const user = await prisma.user.findFirst({
          where: { username: { equals: username, mode: "insensitive" } },
        });
        // Hash a throwaway value when the user doesn't exist so a missing
        // account and a wrong password take the same amount of time.
        if (!user) {
          await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
          return null;
        }

        if (!(await bcrypt.compare(password, user.passwordHash))) return null;

        return { id: String(user.id), username: user.username, email: user.email };
      },
    }),
  ],
});
