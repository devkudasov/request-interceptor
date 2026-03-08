import { useState, useRef, useEffect } from 'react';
import type { UrlMatchType } from '@/shared/types';

const MATCH_TYPES: Array<{ value: UrlMatchType; label: string }> = [
  { value: 'wildcard', label: 'Wild.' },
  { value: 'exact', label: 'Exact' },
  { value: 'regex', label: 'Regex' },
];

interface MatchTypeDropdownProps {
  value: UrlMatchType;
  onChange: (matchType: UrlMatchType) => void;
  disabled?: boolean;
}

export function MatchTypeDropdown({ value, onChange, disabled }: MatchTypeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const currentLabel = MATCH_TYPES.find((t) => t.value === value)?.label ?? value;

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
      setFocusedIndex(MATCH_TYPES.findIndex((t) => t.value === value));
    }
  }, [open, value]);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (matchType: UrlMatchType) => {
    onChange(matchType);
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
        setFocusedIndex((prev) => Math.min(prev + 1, MATCH_TYPES.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < MATCH_TYPES.length) {
          handleSelect(MATCH_TYPES[focusedIndex].value);
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="button"
        aria-label="URL match type"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="flex items-center justify-center gap-xs px-sm h-full min-w-[64px] text-xs text-content-secondary bg-surface-secondary rounded-r-md border-l border-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {currentLabel}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="opacity-60">
          <path d="M1 3L4 6L7 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="URL match types"
          className="absolute top-full right-0 z-50 mt-px min-w-[90px] bg-surface-card border border-border rounded-md shadow-md py-xs"
        >
          {MATCH_TYPES.map((type, index) => {
            const isSelected = type.value === value;
            const isFocused = index === focusedIndex;

            return (
              <li
                key={type.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(type.value)}
                className={`px-sm py-xs text-sm cursor-pointer ${
                  isFocused ? 'bg-surface-secondary' : ''
                } ${isSelected ? 'text-primary font-medium' : 'text-content-primary'}`}
              >
                {type.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
