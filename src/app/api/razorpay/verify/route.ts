import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/razorpay/verify
 * Cryptographically verifies Razorpay payment signature and upgrades User.plan = 'pro' in PostgreSQL
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required to verify payment." },
        { status: 401 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay secret key is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required Razorpay payment verification parameters." },
        { status: 400 }
      );
    }

    // 1. Calculate HMAC SHA256 signature
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    // 2. Validate cryptographic match using length-guarded timing-safe comparison
    const genBuf = Buffer.from(generatedSignature, "utf-8");
    const sigBuf = Buffer.from(razorpay_signature, "utf-8");
    const isSignatureValid =
      genBuf.length === sigBuf.length && crypto.timingSafeEqual(genBuf, sigBuf);

    if (!isSignatureValid) {
      console.error("[RAZORPAY_SIGNATURE_MISMATCH]", {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
      return NextResponse.json(
        { error: "Invalid payment signature. Payment verification failed." },
        { status: 400 }
      );
    }

    // 3. Determine target plan ("business" vs "pro")
    let targetPlan: "pro" | "business" = "pro";
    if (body.plan && body.plan.toLowerCase() === "business") {
      targetPlan = "business";
    } else {
      // Optional fallback: check Razorpay order notes if keyId and keySecret are available
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (keyId) {
        try {
          const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
          const orderCheckRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
            headers: { Authorization: `Basic ${basicAuth}` },
          });
          if (orderCheckRes.ok) {
            const orderCheckData = await orderCheckRes.json();
            if (orderCheckData.notes?.plan === "business" || orderCheckData.amount === 39900) {
              targetPlan = "business";
            }
          }
        } catch {}
      }
    }

    // 4. Update User Plan in PostgreSQL
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        plan: targetPlan,
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        credits: true,
      },
    });

    const planDisplayName = targetPlan === "business" ? "CleanPix Business" : "CleanPix Pro Creator";

    return NextResponse.json({
      success: true,
      plan: updatedUser.plan,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
      message: `Payment successfully verified! Your account has been upgraded to ${planDisplayName}.`,
    });
  } catch (error: any) {
    console.error("[RAZORPAY_VERIFY_API_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error verifying Razorpay payment." },
      { status: 500 }
    );
  }
}
