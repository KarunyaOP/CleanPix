import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return url;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.credits = (user as any).credits ?? 10;
        token.plan = (user as any).plan ?? "free";
        token.authProvider = account?.provider || (user as any).authProvider || "email";
      }
      if (trigger === "update") {
        if (session?.credits !== undefined) {
          token.credits = session.credits;
        }
        if (session?.plan !== undefined) {
          token.plan = session.plan;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id as string;
        (session.user as any).credits = token.credits as number;
        (session.user as any).plan = (token.plan as string) || "free";
        (session.user as any).authProvider = token.authProvider as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "cleanpix_dev_secret_key_1234567890",
};

export const getAuthSession = async () => {
  return getServerSession(authOptions);
};
