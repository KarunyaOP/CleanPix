import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim()?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find or create user in PostgreSQL database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: body.name || null,
          image: body.image || null,
          credits: 10,
          plan: "free",
          authProvider: "email",
        },
      });
    } else if (body.name || body.image) {
      user = await prisma.user.update({
        where: { email },
        data: {
          name: body.name || user.name,
          image: body.image || user.image,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        credits: user.credits,
        plan: user.plan || "free",
        authProvider: user.authProvider,
      },
    });
  } catch (error: any) {
    console.error("[AUTH_PROFILE_SYNC_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync user profile" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim()?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email query param is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        credits: user.credits,
        plan: user.plan || "free",
        authProvider: user.authProvider,
      },
    });
  } catch (error: any) {
    console.error("[AUTH_PROFILE_GET_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
