import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-xs">
        {label && (
          <label className="text-sm font-medium text-content-secondary">{label}</label>
        )}
        <input
          ref={ref}
          className={`px-md py-sm text-base bg-surface-secondary text-content-primary border rounded-md placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
            error ? 'border-status-error' : 'border-border'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-sm text-status-error">{error}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
