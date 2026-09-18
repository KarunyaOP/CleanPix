"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FaqSection } from "@/components/marketing/FaqSection";
import { Footer } from "@/components/layout/Footer";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0A0B1E] text-[#F8FAFC] flex flex-col selection:bg-primary/40 selection:text-white">
      <Navbar />
      <main className="flex-1 pt-4">
        <PricingSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
