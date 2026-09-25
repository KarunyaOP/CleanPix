import { NextRequest, NextResponse } from "next/server";
import { CloudinaryService } from "@/services/cloudinary.service";
import { validateImageFile } from "@/utils/fileValidation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // =========================================================================
    // CASE A: Direct-to-Cloudinary JSON Processing Request (Bypasses Vercel 4.5MB limit)
    // =========================================================================
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      const {
        publicId,
        version,
        fileName,
        width,
        height,
        format,
        faces,
        tags,
        colors,
        illustrationScore,
        framing,
        jobId,
        userEmail: formUserEmail,
        userId: formUserId,
      } = body;

      if (!publicId) {
        return NextResponse.json(
          {
            error: {
              code: "MISSING_PUBLIC_ID",
              message: "No image publicId provided for background removal processing.",
            },
          },
          { status: 400 }
        );
      }

      // Check User Authentication & Atomic Credit Reservation
      const session = await getAuthSession().catch(() => null);
      const headerEmail = request.headers.get("x-user-email")?.trim()?.toLowerCase();
      const headerId = request.headers.get("x-user-id")?.trim();
      const effectiveEmail = formUserEmail || headerEmail || session?.user?.email;
      const effectiveId = formUserId || headerId;

      let dbUser: { id: string; email: string; credits: number; plan: string } | null = null;
      let isUnlimited = false;
      let creditReserved = false;

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

        // For FREE tier: atomically deduct 1 credit if credits > 0
        if (!isUnlimited) {
          const updateResult = await prisma.user.updateMany({
            where: {
              id: dbUser.id,
              credits: { gt: 0 },
            },
            data: {
              credits: { decrement: 1 },
            },
          });

          if (updateResult.count === 0) {
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
          creditReserved = true;
        }
      }

      try {
        // Process AI Background Removal and generate HMAC signed URLs
        const result = await CloudinaryService.processDirectUploadedImage({
          publicId,
          version: typeof version === "number" ? version : undefined,
          fileName: fileName || "image.png",
          width,
          height,
          format: format || "png",
          faces,
          tags,
          colors,
          illustrationScore,
          framing,
          jobId,
          userId: dbUser?.id,
        });

        // Concurrently save project to database and query updated credits
        let savedProject: any = null;
        let remainingCredits: number | undefined = undefined;

        if (dbUser) {
          const validObjects = ["person", "product", "pet", "vehicle", "other"];
          const category = validObjects.includes(result.detectedObject)
            ? result.detectedObject
            : "other";

          const projectSavePromise = prisma.project.create({
            data: {
              userId: dbUser.id,
              originalUrl: result.originalUrl || fileName || publicId,
              processedUrl: result.processedUrl,
              detectedObject: category as any,
              status: "done",
            },
            include: { exports: true },
          }).catch((dbSaveErr) => {
            console.error("[REMOVE_BG_DIRECT_AUTO_SAVE_ERROR]", dbSaveErr);
            return null;
          });

          const creditQueryPromise = isUnlimited
            ? Promise.resolve({ credits: 999999 })
            : prisma.user.findUnique({
                where: { id: dbUser.id },
                select: { credits: true },
              });

          const [saved, freshUser] = await Promise.all([projectSavePromise, creditQueryPromise]);
          savedProject = saved;
          remainingCredits = isUnlimited ? 999999 : Math.max(0, freshUser?.credits ?? 0);
        }

        return NextResponse.json(
          {
            success: true,
            ...result,
            projectId: savedProject?.id || result.jobId,
            creditsRemaining: remainingCredits,
          },
          { status: 200 }
        );
      } catch (processingError: any) {
        // Refund reserved credit if processing fails
        if (dbUser && creditReserved) {
          await prisma.user
            .update({
              where: { id: dbUser.id },
              data: {
                credits: { increment: 1 },
              },
            })
            .catch((err) => console.error("[CREDIT_REFUND_FAILED]", err));
        }
        throw processingError;
      }
    }

    // =========================================================================
    // CASE B: Fallback Multipart FormData Upload (for direct proxy uploads)
    // =========================================================================
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          error: {
            code: "NO_FILE_PROVIDED",
            message: "No image file provided for background removal.",
          },
        },
        { status: 400 }
      );
    }

    // 1. Validate file constraints
    const validation = validateImageFile(file);
    if (!validation.valid && validation.error) {
      const statusCode = validation.error.code === "FILE_TOO_LARGE" ? 413 : 400;
      return NextResponse.json(
        {
          error: validation.error,
        },
        { status: statusCode }
      );
    }

    // 2. Check User Authentication & Atomic Credit Reservation
    const session = await getAuthSession().catch(() => null);
    const formUserEmail = (formData.get("userEmail") as string)?.trim()?.toLowerCase();
    const formUserId = (formData.get("userId") as string)?.trim();
    const headerEmail = request.headers.get("x-user-email")?.trim()?.toLowerCase();
    const headerId = request.headers.get("x-user-id")?.trim();
    const effectiveEmail = formUserEmail || headerEmail || session?.user?.email;
    const effectiveId = formUserId || headerId;

    let dbUser: { id: string; email: string; credits: number; plan: string } | null = null;
    let isUnlimited = false;
    let creditReserved = false;

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

      if (!isUnlimited) {
        const updateResult = await prisma.user.updateMany({
          where: {
            id: dbUser.id,
            credits: { gt: 0 },
          },
          data: {
            credits: { decrement: 1 },
          },
        });

        if (updateResult.count === 0) {
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
        creditReserved = true;
      }
    }

    try {
      // 3. Read image array buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 4. Extract framing parameter
      const framingParam = (formData.get("framing") as string) || "";
      const paddingParam = (formData.get("paddingPercent") as string) || "";
      let framing: "fit" | "balanced" | "spacious" = "fit";
      if (
        framingParam.toLowerCase() === "spacious" ||
        framingParam === "100" ||
        paddingParam === "100"
      ) {
        framing = "spacious";
      } else if (
        framingParam.toLowerCase() === "balanced" ||
        framingParam === "50" ||
        paddingParam === "50"
      ) {
        framing = "balanced";
      }

      // 5. Process Background Removal via CloudinaryService
      const result = await CloudinaryService.removeBackground(
        buffer,
        file.name,
        file.type || "image/png",
        framing,
        dbUser?.id
      );

      // 6. Concurrently save project to database and query updated credits
      let savedProject: any = null;
      let remainingCredits: number | undefined = undefined;

      if (dbUser) {
        const validObjects = ["person", "product", "pet", "vehicle", "other"];
        const category = validObjects.includes(result.detectedObject)
          ? result.detectedObject
          : "other";

        const projectSavePromise = prisma.project.create({
          data: {
            userId: dbUser.id,
            originalUrl: result.originalUrl || file.name,
            processedUrl: result.processedUrl,
            detectedObject: category as any,
            status: "done",
          },
          include: { exports: true },
        }).catch((dbSaveErr) => {
          console.error("[REMOVE_BG_AUTO_SAVE_ERROR]", dbSaveErr);
          return null;
        });

        const creditQueryPromise = isUnlimited
          ? Promise.resolve({ credits: 999999 })
          : prisma.user.findUnique({
              where: { id: dbUser.id },
              select: { credits: true },
            });

        const [saved, freshUser] = await Promise.all([projectSavePromise, creditQueryPromise]);
        savedProject = saved;
        remainingCredits = isUnlimited ? 999999 : Math.max(0, freshUser?.credits ?? 0);
      }

      return NextResponse.json(
        {
          success: true,
          ...result,
          projectId: savedProject?.id || result.jobId,
          creditsRemaining: remainingCredits,
        },
        { status: 200 }
      );
    } catch (processingError: any) {
      if (dbUser && creditReserved) {
        await prisma.user
          .update({
            where: { id: dbUser.id },
            data: {
              credits: { increment: 1 },
            },
          })
          .catch((err) => console.error("[CREDIT_REFUND_FAILED]", err));
      }
      throw processingError;
    }
  } catch (error: any) {
    console.error("[API_REMOVE_BACKGROUND_ERROR]", error);
    return NextResponse.json(
      {
        error: {
          code: error.code || "AI_PROCESSING_FAILED",
          message: error.message || "Failed to remove background from image.",
          details: error.details,
        },
      },
      { status: 500 }
    );
  }
}
