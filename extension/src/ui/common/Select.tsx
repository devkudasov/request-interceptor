import { type SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export function Select({ label, options, onChange, value, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-xs">
      {label && (
        <label className="text-sm font-medium text-content-secondary">{label}</label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-md py-sm text-base bg-surface-secondary text-content-primary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
