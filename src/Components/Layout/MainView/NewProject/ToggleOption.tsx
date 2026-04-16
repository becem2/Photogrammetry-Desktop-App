import * as Switch from "@radix-ui/react-switch";

// Reusable labeled toggle used by the new-project processing options.
interface ToggleOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  invalid?: boolean;
}

function ToggleOption({ label, description, checked, onChange, invalid }: ToggleOptionProps) {
  return (
    <div className="flex items-start justify-between py-2">
      <div className="flex-1">
        <h3 className={`text-sm mb-1 ${invalid ? "text-red-500" : ""}`}>{label}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        className={`w-11 h-6 bg-input border rounded-full relative data-[state=checked]:bg-primary transition-colors outline-none ${
          invalid ? "border-red-500" : "border-border"
        }`}
      >
        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-5.5" />
      </Switch.Root>
    </div>
  );
}

export default ToggleOption;