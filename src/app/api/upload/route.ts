import { NextRequest, NextResponse } from "next/server";
import { UploadService } from "@/services/upload.service";
import { MAX_FILE_SIZE_BYTES } from "@/utils/fileValidation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          error: {
            code: "NO_FILE_PROVIDED",
            message: "No image file provided. Please select an image to upload.",
          },
        },
        { status: 400 }
      );
    }

    // Process upload through server service
    const metadata = await UploadService.processUpload(file);

    return NextResponse.json(
      {
        success: true,
        ...metadata,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API_UPLOAD_ERROR]", error);

    const statusCode =
      error.code === "FILE_TOO_LARGE"
        ? 413
        : error.code === "INVALID_FILE_TYPE"
        ? 400
        : 500;

    return NextResponse.json(
      {
        error: {
          code: error.code || "INTERNAL_ERROR",
          message: error.message || "Failed to process image upload.",
          details: error.details,
        },
      },
      { status: statusCode }
    );
  }
}
