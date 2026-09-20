import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/razorpay/order
 * Creates a one-time Razorpay Order for Pro Creator or Business upgrade
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession().catch(() => null);
    const body = await req.json().catch(() => ({}));

    // Support email/id from request body, custom headers, or server session
    const effectiveEmail =
      body.userEmail?.trim()?.toLowerCase() ||
      req.headers.get("x-user-email")?.trim()?.toLowerCase() ||
      session?.user?.email;

    const effectiveId =
      body.userId?.trim() ||
      req.headers.get("x-user-id")?.trim() ||
      (session?.user as any)?.id;

    if (!effectiveEmail && !effectiveId) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to upgrade." },
        { status: 401 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          error: "Razorpay payment gateway is not configured. Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.",
        },
        { status: 500 }
      );
    }

    // Look up user in database by ID or Email
    let user = await prisma.user.findFirst({
      where: effectiveEmail
        ? { email: effectiveEmail }
        : { id: effectiveId! },
      select: { id: true, email: true, name: true, plan: true },
    });

    // Auto-upsert if user authenticated in Supabase but not yet present in Prisma
    if (!user && effectiveEmail) {
      user = await prisma.user.upsert({
        where: { email: effectiveEmail },
        update: {},
        create: {
          id: effectiveId || undefined,
          email: effectiveEmail,
          name: body.userName || session?.user?.name || "CleanPix Member",
          credits: 10,
          plan: "free",
        },
        select: { id: true, email: true, name: true, plan: true },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    let targetPlan: "pro" | "business" = "pro";
    if (body?.plan?.toLowerCase() === "business") {
      targetPlan = "business";
    }

    const currentPlan = (user.plan || "free").toLowerCase();

    // Server-Side Plan Validation: Prevent duplicate orders for already owned plans
    if (currentPlan === "business" || currentPlan === "enterprise") {
      return NextResponse.json(
        { error: "You already have the Business plan." },
        { status: 400 }
      );
    }

    if (currentPlan === "pro" && targetPlan === "pro") {
      return NextResponse.json(
        { error: "You already have the Pro plan." },
        { status: 400 }
      );
    }

    // Target plan pricing: Pro = ₹99 (9900 paise), Business = ₹399 (39900 paise)
    const amount = targetPlan === "business" ? 39900 : 9900;
    const currency = (process.env.RAZORPAY_CURRENCY || "INR").toUpperCase();

    // Create Razorpay order via REST API using Basic Auth
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const receipt = `cp_rcpt_${Date.now()}_${user.id.slice(0, 6)}`;

    const orderPayload = {
      amount,
      currency,
      receipt,
      notes: {
        userId: user.id,
        userEmail: user.email,
        userName: user.name || "CleanPix Member",
        plan: targetPlan,
      },
    };

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[RAZORPAY_ORDER_CREATE_ERROR]", data);
      return NextResponse.json(
        {
          error: data.error?.description || data.message || "Failed to create Razorpay order.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId,
      plan: targetPlan,
      receipt: data.receipt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("[RAZORPAY_ORDER_API_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error creating Razorpay order." },
      { status: 500 }
    );
  }
}
