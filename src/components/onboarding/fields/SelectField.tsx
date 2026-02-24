interface SelectFieldProps {
  fieldKey: string;
  label: string;
  required?: boolean;
  options: string[];
  value: string;
  onChange: (key: string, value: string) => void;
}

export function SelectField({
  fieldKey, label, required, options, value, onChange,
}: SelectFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={fieldKey} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <select
        id={fieldKey}
        name={fieldKey}
        value={value}
        required={required}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
