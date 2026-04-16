// Styled text field used by the settings forms.
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
}

function TextInput({ value, onChange }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-60 px-3 py-1.5 bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
    />
  );
}

export default TextInput;