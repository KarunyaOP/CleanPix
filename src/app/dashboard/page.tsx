import React from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — CleanPix",
  description: "View your image processing statistics, recent projects, and credit balance.",
};

export default async function DashboardPage() {
  // 1. Auth Protection: Verify active NextAuth session
  const session = await getAuthSession();

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard");
  }

  // 2. Query Real Database Values via Prisma ORM
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
    redirect("/login?callbackUrl=/dashboard");
  }

  // 3. Compute Real Metrics
  const totalProjects = user.projects.length;
  const totalProcessed = user.projects.filter(
    (p) => p.status === "done" || Boolean(p.processedUrl)
  ).length;
  const creditsRemaining = user.credits ?? 10;

  // 4. Format Recent 5 Projects
  const recentProjects = user.projects.slice(0, 5).map((p) => ({
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
    <DashboardClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        credits: creditsRemaining,
        plan: user.plan ?? "free",
        authProvider: user.authProvider,
        createdAt: user.createdAt.toISOString(),
      }}
      initialStats={{
        totalProjects,
        totalProcessed,
        creditsRemaining,
      }}
      initialRecentProjects={recentProjects}
    />
  );
}
