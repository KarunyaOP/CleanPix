"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/AuthProvider";
import { DashboardClient, DashboardProject } from "@/components/dashboard/DashboardClient";
import { getCachedProjects } from "@/utils/projectCache";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0A0B1E] flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-accent" />
        <p className="text-sm font-medium text-text-muted">Loading your CleanPix dashboard...</p>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    return <div className="min-h-screen bg-[#0A0B1E]" aria-hidden="true" />;
  }

  const user = session.user as any;
  const userKey = user.id || user.email || "guest";
  const cached = getCachedProjects(userKey);

  return (
    <DashboardClient
      user={{
        id: user.id || "user",
        name: user.name,
        email: user.email,
        image: user.image,
        credits: user.credits ?? 10,
        plan: user.plan ?? "free",
        authProvider: user.authProvider || "email",
        createdAt: new Date().toISOString(),
      }}
      initialStats={{
        totalProjects: cached.totalProjects,
        totalProcessed: cached.totalProcessed,
        creditsRemaining: user.credits ?? 10,
      }}
      initialRecentProjects={cached.projects.slice(0, 5)}
    />
  );
}
