import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

import nodemailer from "nodemailer";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER || {
        host: process.env.EMAIL_SERVER_HOST || "localhost",
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        auth:
          process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD
            ? {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
              }
            : undefined,
      },
      from: process.env.EMAIL_FROM || "CleanPix <no-reply@cleanpix.app>",
      maxAge: 24 * 60 * 60, // 24 hours
      async sendVerificationRequest({ identifier: email, url, provider }) {
        try {
          const transport = nodemailer.createTransport(provider.server);
          const result = await transport.sendMail({
            to: email,
            from: provider.from,
            subject: "Sign in to CleanPix",
            text: `Sign in to CleanPix:\n\n${url}\n\nThis link is valid for 24 hours.\nIf you did not request this email, please ignore it.`,
            html: `
              <div style="background-color: #0A0B1E; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #F8FAFC; text-align: center;">
                <div style="max-width: 480px; margin: 0 auto; background: #131A3A; border: 1px solid rgba(79, 124, 255, 0.35); border-radius: 24px; padding: 36px 28px; box-shadow: 0 16px 40px rgba(0,0,0,0.6);">
                  <h1 style="color: #FFFFFF; font-size: 26px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -0.02em;">
                    Clean<span style="color: #38BDF8;">Pix</span>
                  </h1>
                  <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 28px 0;">
                    Click the button below to authenticate securely and sign in to your CleanPix account.
                  </p>
                  <a href="${url}" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #4F7CFF, #8B5CF6); color: #FFFFFF; font-weight: 700; font-size: 14px; padding: 14px 32px; text-decoration: none; border-radius: 9999px; box-shadow: 0 0 24px rgba(79, 124, 255, 0.55);">
                    Sign In to CleanPix
                  </a>
                  <p style="color: #64748B; font-size: 12px; margin: 28px 0 0 0; line-height: 1.5;">
                    This link expires in 24 hours. If you did not request this sign-in, you can safely disregard this email.
                  </p>
                </div>
              </div>
            `,
          });

          const failed = result.rejected.concat(result.pending).filter(Boolean);
          if (failed.length) {
            throw new Error(`Email (${failed.join(", ")}) could not be delivered`);
          }
        } catch (error: any) {
          console.error("[NEXTAUTH_EMAIL_SEND_FAILED]", {
            host: typeof provider.server === "object" ? (provider.server as any).host : "SERVER_URL",
            port: typeof provider.server === "object" ? (provider.server as any).port : undefined,
            message: error.message,
            code: error.code,
          });

          // In development mode, log magic link directly to terminal for seamless local testing
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `\n======================================================\n[CLEANPIX DEV MAGIC LINK]\nRecipient: ${email}\nSign-in URL: ${url}\n======================================================\n`
            );
          }

          throw new Error("EMAIL_SEND_FAILED: " + error.message);
        }
      },
    }),
  ],
  callbacks: {
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

export const getAuthSession = () => getServerSession(authOptions);
