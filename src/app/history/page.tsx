"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/AuthProvider";
import { HistoryClient, ProjectRecord } from "@/components/history/HistoryClient";
import { Loader2 } from "lucide-react";

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/history");
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
        .catch((err) => console.error("[HISTORY_PROJECTS_FETCH_ERROR]", err))
        .finally(() => setIsLoadingProjects(false));
    }
  }, [status, session?.user?.email]);

  if (status === "loading" || (status === "authenticated" && isLoadingProjects)) {
    return (
      <div className="min-h-screen bg-[#0A0B1E] flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-accent" />
        <p className="text-sm font-medium text-text-muted">Loading your processing history...</p>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    return <div className="min-h-screen bg-[#0A0B1E]" aria-hidden="true" />;
  }

  const user = session.user as any;

  return (
    <HistoryClient
      initialProjects={projects}
      initialUser={{
        name: user.name,
        email: user.email,
        plan: user.plan ?? "free",
        credits: user.credits ?? 10,
      }}
    />
  );
}
