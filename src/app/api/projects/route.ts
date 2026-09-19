import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DetectedObject } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects
 * Fetches user's complete processing history from PostgreSQL database
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    const { searchParams } = new URL(request.url);
    const queryEmail = searchParams.get("userEmail") || request.headers.get("x-user-email");
    const effectiveEmail = queryEmail?.trim()?.toLowerCase() || session?.user?.email;

    if (!effectiveEmail) {
      return NextResponse.json({
        success: true,
        projects: [],
        totalCount: 0,
        authenticated: false,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: effectiveEmail },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        projects: [],
        totalCount: 0,
        authenticated: false,
      });
    }

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const pageParam = searchParams.get("page");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const skip = limit ? (page - 1) * limit : undefined;

    const totalCount = await prisma.project.count({
      where: { userId: user.id },
    });

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { exports: true },
      take: limit,
      skip: skip,
    });

    return NextResponse.json({
      success: true,
      projects,
      totalCount,
      page,
      authenticated: true,
    });
  } catch (error: any) {
    console.error("[API_GET_PROJECTS_ERROR]", error);
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to load project history from database.",
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Saves a new background removal project record to PostgreSQL
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    const body = await request.json().catch(() => ({}));
    const { originalUrl, processedUrl, detectedObject, userEmail } = body;
    const headerEmail = request.headers.get("x-user-email");
    const effectiveEmail = userEmail?.trim()?.toLowerCase() || headerEmail?.trim()?.toLowerCase() || session?.user?.email;

    if (!effectiveEmail) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to save project history.",
          },
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: effectiveEmail },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "USER_NOT_FOUND",
            message: "User account not found.",
          },
        },
        { status: 404 }
      );
    }

    if (!originalUrl || !processedUrl) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_PAYLOAD",
            message: "originalUrl and processedUrl are required.",
          },
        },
        { status: 400 }
      );
    }

    // Check if project was already saved during background removal to avoid duplication
    const existing = await prisma.project.findFirst({
      where: {
        userId: user.id,
        processedUrl: processedUrl,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        project: existing,
      });
    }

    // Map detected category to schema enum
    const validObjects: DetectedObject[] = ["person", "product", "pet", "vehicle", "other"];
    const category: DetectedObject = validObjects.includes(detectedObject)
      ? (detectedObject as DetectedObject)
      : "other";

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        originalUrl,
        processedUrl,
        detectedObject: category,
        status: "done",
      },
      include: { exports: true },
    });

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error: any) {
    console.error("[API_CREATE_PROJECT_ERROR]", error);
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to save project record to database.",
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects?id=... OR /api/projects?all=true
 * Securely deletes single project or all projects for the authenticated user only
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to delete projects.",
          },
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "USER_NOT_FOUND",
            message: "User account not found.",
          },
        },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all");

    // Case 1: Delete ALL history records for this authenticated user only
    if (all === "true") {
      const deleteResult = await prisma.project.deleteMany({
        where: {
          userId: user.id,
        },
      });

      return NextResponse.json({
        success: true,
        deletedCount: deleteResult.count,
        all: true,
      });
    }

    // Case 2: Delete single history record owned by this user
    if (!id) {
      return NextResponse.json(
        {
          error: {
            code: "MISSING_ID",
            message: "Project id or all=true parameter is required.",
          },
        },
        { status: 400 }
      );
    }

    const deleteResult = await prisma.project.deleteMany({
      where: {
        id: id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      deletedId: id,
    });
  } catch (error: any) {
    console.error("[API_DELETE_PROJECT_ERROR]", error);
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to delete project record.",
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
