import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DetectedObject } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Helper to reliably resolve the authenticated user from Supabase ID, headers, query, body, or NextAuth session
 */
async function resolveUser(request: NextRequest, body?: any) {
  const session = await getAuthSession().catch(() => null);
  const { searchParams } = new URL(request.url);

  const queryId = searchParams.get("userId") || request.headers.get("x-user-id") || body?.userId;
  const queryEmail =
    searchParams.get("userEmail") ||
    request.headers.get("x-user-email") ||
    body?.userEmail ||
    session?.user?.email;

  const effectiveEmail = queryEmail ? queryEmail.trim().toLowerCase() : null;
  const effectiveId = queryId ? queryId.trim() : null;

  if (!effectiveId && !effectiveEmail) {
    return null;
  }

  let user = null;
  if (effectiveId) {
    user = await prisma.user.findUnique({
      where: { id: effectiveId },
    });
  }

  if (!user && effectiveEmail) {
    user = await prisma.user.findUnique({
      where: { email: effectiveEmail },
    });
  }

  return user;
}

/**
 * GET /api/projects
 * Fetches user's complete processing history from PostgreSQL database
 */
export async function GET(request: NextRequest) {
  try {
    const user = await resolveUser(request);

    if (!user) {
      return NextResponse.json({
        success: true,
        projects: [],
        totalCount: 0,
        authenticated: false,
      });
    }

    const { searchParams } = new URL(request.url);
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
    const body = await request.json().catch(() => ({}));
    const user = await resolveUser(request, body);

    if (!user) {
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

    const { originalUrl, processedUrl, detectedObject } = body;

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
    const user = await resolveUser(request);

    if (!user) {
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

    if (deleteResult.count === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Project record not found or does not belong to this account.",
          },
        },
        { status: 404 }
      );
    }

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
          message: "Failed to delete project record from database.",
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
