import { useState, useRef, useEffect } from 'react';
import type { HttpMethod } from '@/features/rules';
import { methodColors } from '@/ui/theme/tokens';

const METHODS: Array<HttpMethod | 'ANY'> = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface MethodDropdownProps {
  value: HttpMethod | 'ANY';
  onChange: (method: HttpMethod | 'ANY') => void;
  disabled?: boolean;
}

export function MethodDropdown({ value, onChange, disabled }: MethodDropdownProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setFocusedIndex(METHODS.indexOf(value));
    }
  }, [open, value]);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (method: HttpMethod | 'ANY') => {
    onChange(method);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, METHODS.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < METHODS.length) {
          handleSelect(METHODS[focusedIndex]);
        }
        break;
    }
  };

  useEffect(() => {
    if (open && focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      const el = items[focusedIndex] as HTMLElement | undefined;
      el?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [focusedIndex, open]);

  const color = methodColors[value] ?? '#6B7280';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="button"
        aria-label="HTTP method"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="flex items-center justify-center gap-xs px-sm h-full min-w-[60px] text-sm font-semibold rounded-l-md border-r border-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {value}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="opacity-60">
          <path d="M1 3L4 6L7 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="HTTP methods"
          className="absolute top-full left-0 z-50 mt-px min-w-[80px] bg-surface-card border border-border rounded-md shadow-md py-xs overflow-auto max-h-64"
        >
          {METHODS.map((method, index) => {
            const methodColor = methodColors[method] ?? '#6B7280';
            const isSelected = method === value;
            const isFocused = index === focusedIndex;

            return (
              <li
                key={method}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(method)}
                className={`flex items-center gap-sm px-sm py-xs text-sm cursor-pointer ${
                  isFocused ? 'bg-surface-secondary' : ''
                } ${isSelected ? 'font-semibold' : ''}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: methodColor }}
                />
                {method}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
