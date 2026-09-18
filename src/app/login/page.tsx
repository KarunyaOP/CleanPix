"use client";

import React from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0A0B1E] flex flex-col items-center justify-center px-4 sm:px-6 py-12 relative select-none overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[#4F7CFF]/20 via-[#8B5CF6]/15 to-[#22D3EE]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-[#4F7CFF]/15 rounded-full blur-2xl pointer-events-none -z-10" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-[#8B5CF6]/15 rounded-full blur-2xl pointer-events-none -z-10" />

      <LoginForm guestHref="/" />
    </main>
  );
}
