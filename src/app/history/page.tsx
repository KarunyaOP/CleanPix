"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/AuthProvider";
import { HistoryClient, ProjectRecord } from "@/components/history/HistoryClient";
import { Loader2 } from "lucide-react";

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/history");
    }
  }, [status, router]);

  if (status === "loading") {
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
      initialProjects={[]}
      initialUser={{
        name: user.name,
        email: user.email,
        plan: user.plan ?? "free",
        credits: user.credits ?? 10,
      }}
    />
  );
}
