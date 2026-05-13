"use client";

import { ScriptGeneratorSection } from "@/components/dashboard/script-generator/ScriptGeneratorSection";

export function ScriptsSection() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ScriptGeneratorSection />
    </div>
  );
}
