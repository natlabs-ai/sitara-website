interface DocumentUploadFieldProps {
  fieldKey: string;
  label: string;
  required?: boolean;
  onChange: (key: string, file: File) => void;
}

export function DocumentUploadField({
  fieldKey, label, required, onChange,
}: DocumentUploadFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={fieldKey} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <input
        id={fieldKey}
        name={fieldKey}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        required={required}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(fieldKey, file);
        }}
        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
      />
    </div>
  );
}
