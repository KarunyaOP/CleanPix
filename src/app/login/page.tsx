"use client";

import React, { useEffect, Suspense } from "react";
import { useSession } from "@/components/providers/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";

function LoginPageContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "authenticated") {
      const raw = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/";
      const target = raw === "/login" ? "/" : raw;
      router.replace(target);
    }
  }, [status, router, searchParams]);

  // If already authenticated, show neutral background while redirecting to destination
  if (status === "authenticated") {
    return <div className="min-h-screen bg-[#0A0B1E]" aria-hidden="true" />;
  }

  return (
    <main className="min-h-screen min-h-[100dvh] bg-[#0A0B1E] flex flex-col items-center justify-center px-3.5 sm:px-6 py-6 sm:py-12 relative select-none overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] bg-gradient-to-tr from-[#4F7CFF]/20 via-[#8B5CF6]/15 to-[#22D3EE]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-48 sm:w-64 h-48 sm:h-64 bg-[#4F7CFF]/15 rounded-full blur-2xl pointer-events-none -z-10" />
      <div className="absolute top-10 right-10 w-52 sm:w-72 h-52 sm:h-72 bg-[#8B5CF6]/15 rounded-full blur-2xl pointer-events-none -z-10" />

      <LoginForm guestHref="/" />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0B1E]" aria-hidden="true" />}>
      <LoginPageContent />
    </Suspense>
  );
}
