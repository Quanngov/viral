"use client";

import { ScriptGeneratorSection } from "@/components/dashboard/script-generator/ScriptGeneratorSection";

type ScriptsSectionProps = {
  active: boolean;
};

export function ScriptsSection({ active }: ScriptsSectionProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-full lg:overflow-hidden">
      <ScriptGeneratorSection active={active} />
    </div>
  );
}
