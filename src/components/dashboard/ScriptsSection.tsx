"use client";

import { ScriptGeneratorSection } from "@/components/dashboard/script-generator/ScriptGeneratorSection";

export function ScriptsSection() {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-full lg:overflow-hidden">
      <ScriptGeneratorSection />
    </div>
  );
}
