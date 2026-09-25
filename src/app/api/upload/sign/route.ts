import { NextRequest, NextResponse } from "next/server";
import { CloudinaryService } from "@/services/cloudinary.service";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const session = await getAuthSession().catch(() => null);

    const formUserEmail = body.userEmail?.trim()?.toLowerCase();
    const formUserId = body.userId?.trim();
    const headerEmail = request.headers.get("x-user-email")?.trim()?.toLowerCase();
    const headerId = request.headers.get("x-user-id")?.trim();

    const effectiveEmail = formUserEmail || headerEmail || session?.user?.email;
    const effectiveId = formUserId || headerId;

    let dbUser: { id: string; email: string; credits: number; plan: string } | null = null;
    let isUnlimited = false;

    if (effectiveId) {
      dbUser = await prisma.user.findUnique({
        where: { id: effectiveId },
        select: { id: true, email: true, credits: true, plan: true },
      });
    }

    if (!dbUser && effectiveEmail) {
      dbUser = await prisma.user.findUnique({
        where: { email: effectiveEmail },
        select: { id: true, email: true, credits: true, plan: true },
      });
    }

    if (dbUser) {
      const userPlan = (dbUser.plan || "free").toLowerCase();
      isUnlimited = userPlan === "pro" || userPlan === "business" || userPlan === "enterprise";

      // For FREE tier: Check if user has at least 1 credit remaining
      if (!isUnlimited && dbUser.credits <= 0) {
        return NextResponse.json(
          {
            error: {
              code: "INSUFFICIENT_CREDITS",
              message: "You have 0 credits remaining. Please upgrade your plan to continue processing images.",
              creditsRemaining: 0,
            },
          },
          { status: 403 }
        );
      }
    }

    // Generate cryptographic direct upload signature scoped to user folder
    const signResult = CloudinaryService.generateDirectUploadSignature(dbUser?.id);

    return NextResponse.json(
      {
        success: true,
        ...signResult,
        userId: dbUser?.id,
        creditsRemaining: dbUser ? (isUnlimited ? 999999 : dbUser.credits) : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API_UPLOAD_SIGN_ERROR]", error);
    return NextResponse.json(
      {
        error: {
          code: error.code || "SIGNATURE_GENERATION_FAILED",
          message: error.message || "Failed to generate upload signature.",
          details: error.details,
        },
      },
      { status: 500 }
    );
  }
}
