"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/AuthProvider";
import { DashboardClient, DashboardProject } from "@/components/dashboard/DashboardClient";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      const emailQuery = `?userEmail=${encodeURIComponent(session.user.email)}`;
      fetch(`/api/projects${emailQuery}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.projects)) {
            setProjects(data.projects);
          }
        })
        .catch((err) => console.error("[DASHBOARD_PROJECTS_FETCH_ERROR]", err))
        .finally(() => setIsLoadingProjects(false));
    }
  }, [status, session?.user?.email]);

  if (status === "loading" || (status === "authenticated" && isLoadingProjects)) {
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
  const totalProjects = projects.length;
  const totalProcessed = projects.filter((p) => p.status === "done" || Boolean(p.processedUrl)).length;
  const creditsRemaining = user.credits ?? 10;
  const recentProjects = projects.slice(0, 5);

  return (
    <DashboardClient
      user={{
        id: user.id || "user",
        name: user.name,
        email: user.email,
        image: user.image,
        credits: creditsRemaining,
        plan: user.plan ?? "free",
        authProvider: user.authProvider || "email",
        createdAt: new Date().toISOString(),
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
