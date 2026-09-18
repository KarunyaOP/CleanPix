import React from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HistoryClient, ProjectRecord } from "@/components/history/HistoryClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Processing History — CleanPix",
  description: "View, copy, and download all your AI-isolated background removals and social exports.",
};

export default async function HistoryPage() {
  const session = await getAuthSession();

  // If user is not authenticated, redirect to login with callbackUrl
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/history");
  }

  // Fetch ALL projects for the authenticated user from PostgreSQL database (no hardcoded limits)
  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    include: {
      projects: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          exports: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login?callbackUrl=/history");
  }

  // Map database project records for HistoryClient
  const allProjects: ProjectRecord[] = user.projects.map((p) => ({
    id: p.id,
    originalUrl: p.originalUrl,
    processedUrl: p.processedUrl,
    detectedObject: p.detectedObject ? String(p.detectedObject) : null,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    exports: p.exports.map((exp) => ({
      id: exp.id,
      format: String(exp.format),
      url: exp.url,
    })),
  }));

  return (
    <HistoryClient
      initialProjects={allProjects}
      initialUser={{
        name: user.name,
        email: user.email,
        plan: user.plan ?? "free",
        credits: user.credits ?? 10,
      }}
    />
  );
}
