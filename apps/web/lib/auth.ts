import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getEnv } from "@autointern/config";
import { prisma } from "./prisma";
import { verifyPassword } from "./passwords";

const env = getEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt"
  },
  providers: [
    Credentials({
      name: "Username and Password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!username || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username }
        });

        if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
          return null;
        }

        return {
          id: user.id,
          name: user.name ?? user.username,
          email: user.email,
          username: user.username,
          submissionMode: user.submissionMode
        };
      }
    })
  ],
  pages: {
    signIn: "/signin"
  },
  secret: env.AUTH_SECRET,
  trustHost: env.AUTH_TRUST_HOST === "true",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.submissionMode = (user as { submissionMode?: "APPROVAL_FIRST" | "AUTO_SUBMIT" }).submissionMode ?? "APPROVAL_FIRST";
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = String(token.id);
      session.user.submissionMode =
        token.submissionMode === "AUTO_SUBMIT" ? "AUTO_SUBMIT" : "APPROVAL_FIRST";
      return session;
    }
  }
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user;
}
