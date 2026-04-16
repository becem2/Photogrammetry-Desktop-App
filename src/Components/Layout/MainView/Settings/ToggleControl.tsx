import * as Switch from "@radix-ui/react-switch";

// Shared toggle switch primitive for settings rows.
interface ToggleControlProps {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

function ToggleControl({ checked, onCheckedChange }: ToggleControlProps) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="w-11 h-6 bg-input border border-border rounded-full relative data-[state=checked]:bg-primary transition-colors outline-none cursor-pointer"
    >
      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-5.5 shadow-sm" />
    </Switch.Root>
  );
}

export default ToggleControl;