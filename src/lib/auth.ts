import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

import nodemailer from "nodemailer";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET || "cleanpix_super_secret_jwt_key_9876543210",
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
      server: {
        host: process.env.EMAIL_SERVER_HOST || "smtp-relay.brevo.com",
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER || "",
          pass: process.env.EMAIL_SERVER_PASSWORD || "",
        },
      },
      from: process.env.EMAIL_FROM || "CleanPix <no-reply@cleanpix.app>",
      maxAge: 24 * 60 * 60, // 24 hours
      async sendVerificationRequest({ identifier: email, url, provider }) {
        try {
          const host = process.env.EMAIL_SERVER_HOST || (typeof provider.server === "object" ? (provider.server as any).host : "smtp-relay.brevo.com");
          const port = Number(process.env.EMAIL_SERVER_PORT) || (typeof provider.server === "object" ? Number((provider.server as any).port) : 587);
          const user = process.env.EMAIL_SERVER_USER || (typeof provider.server === "object" ? (provider.server as any).auth?.user : undefined);
          const pass = process.env.EMAIL_SERVER_PASSWORD || (typeof provider.server === "object" ? (provider.server as any).auth?.pass : undefined);
          const from = process.env.EMAIL_FROM || provider.from || "CleanPix <no-reply@cleanpix.app>";

          const transport = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: user && pass ? { user, pass } : undefined,
            tls: {
              rejectUnauthorized: false,
            },
          });

          console.log(`[NEXTAUTH_EMAIL_SENDING] Sending sign-in magic link to: ${email} via ${host}:${port}`);

          const result = await transport.sendMail({
            to: email,
            from,
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

          console.log(`✅ [NEXTAUTH_EMAIL_SENT] Magic link email successfully sent! Message ID: ${result.messageId} | Response: ${result.response}`);
          if (process.env.NODE_ENV !== "production") {
            console.log(`[CLEANPIX DEV MAGIC LINK URL]: ${url}`);
          }
        } catch (error: any) {
          console.error("[NEXTAUTH_EMAIL_SEND_FAILED]", {
            host: process.env.EMAIL_SERVER_HOST,
            port: process.env.EMAIL_SERVER_PORT,
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
    async redirect({ url, baseUrl }) {
      try {
        console.log("[NEXTAUTH_REDIRECT_CALLBACK_INVOKED]", { url, baseUrl });

        // 1. If relative URL
        if (url.startsWith("/")) {
          // Check for malformed /http or /https nested strings (e.g. /https://...)
          if (url.startsWith("/http://") || url.startsWith("/https://")) {
            const stripped = url.replace(/^\/https?:\/\/[^\/]+/, "") || "/";
            const cleanPath = stripped.startsWith("/") ? stripped : `/${stripped}`;
            const finalUrl = `${baseUrl}${cleanPath === "/login" ? "/" : cleanPath}`;
            console.log("[NEXTAUTH_REDIRECT_SANITIZED_RELATIVE]", { from: url, to: finalUrl });
            return finalUrl;
          }
          if (url === "/login") {
            return `${baseUrl}/`;
          }
          return `${baseUrl}${url}`;
        }

        // 2. If absolute URL
        const parsedUrl = new URL(url);
        const parsedBase = new URL(baseUrl);

        // Check if matching origin or cleanpix/vercel domain
        if (
          parsedUrl.origin === parsedBase.origin ||
          parsedUrl.hostname.endsWith("vercel.app") ||
          parsedUrl.hostname.endsWith("cleanpix.app") ||
          parsedUrl.hostname === "localhost"
        ) {
          // Check if pathname contains nested /http...
          if (
            parsedUrl.pathname.startsWith("/http://") ||
            parsedUrl.pathname.startsWith("/https://")
          ) {
            const stripped = parsedUrl.pathname.replace(/^\/https?:\/\/[^\/]+/, "") || "/";
            const cleanPath = stripped.startsWith("/") ? stripped : `/${stripped}`;
            const finalUrl = `${parsedBase.origin}${cleanPath === "/login" ? "/" : cleanPath}${parsedUrl.search}${parsedUrl.hash}`;
            console.log("[NEXTAUTH_REDIRECT_SANITIZED_ABSOLUTE]", { from: url, to: finalUrl });
            return finalUrl;
          }

          if (parsedUrl.pathname === "/login") {
            return `${parsedBase.origin}/`;
          }

          return url;
        }
      } catch (err) {
        console.error("[NEXTAUTH_REDIRECT_CALLBACK_ERROR]", { url, baseUrl, error: err });
      }

      // Safe fallback: CleanPix root home editor
      return `${baseUrl}/`;
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

export const getAuthSession = () => getServerSession(authOptions);
