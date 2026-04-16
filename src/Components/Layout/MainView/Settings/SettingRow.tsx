import type { ReactNode } from "react";

// One horizontal settings row with label, description, and control.
interface SettingRowProps {
  label: string;
  description: string;
  control: ReactNode;
}

function SettingRow({ label, description, control }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-0.5">{label}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export default SettingRow;