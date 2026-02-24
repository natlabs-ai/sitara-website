interface TextFieldProps {
  fieldKey: string;
  label: string;
  type?: "text" | "email" | "date" | "tel";
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (key: string, value: string) => void;
}

export function TextField({
  fieldKey, label, type = "text", required, placeholder, value, onChange,
}: TextFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={fieldKey} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <input
        id={fieldKey}
        name={fieldKey}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
