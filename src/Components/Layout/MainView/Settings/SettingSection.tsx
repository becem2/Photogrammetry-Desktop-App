import type { ElementType, ReactNode } from "react";

// Group of related settings rendered as a titled card.
interface SettingSectionProps {
  icon: ElementType;
  title: string;
  children: ReactNode;
}

function SettingSection({ icon: Icon, title, children }: SettingSectionProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default SettingSection;