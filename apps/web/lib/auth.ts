import NextAuth from "next-auth";
import Email from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import nodemailer from "nodemailer";
import { getEnv } from "@autointern/config";
import { prisma } from "./prisma";

const env = getEnv();

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: env.SMTP_USER
    ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD
      }
    : undefined
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database"
  },
  providers: [
    Email({
      server: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        auth: env.SMTP_USER
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASSWORD
            }
          : undefined
      },
      from: env.SMTP_FROM,
      async sendVerificationRequest({ identifier, url, provider }) {
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: "Sign in to AutoIntern",
          text: `Sign in to AutoIntern by opening this link: ${url}`
        });
      }
    })
  ],
  pages: {
    signIn: "/signin"
  },
  secret: env.AUTH_SECRET,
  trustHost: env.AUTH_TRUST_HOST === "true",
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { submissionMode: true }
      });
      session.user.submissionMode = dbUser?.submissionMode ?? "APPROVAL_FIRST";
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
