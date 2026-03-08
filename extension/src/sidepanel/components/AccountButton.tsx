import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/shared/store';
import { getInitials } from '@/shared/utils/account';
import { AccountPopover } from './AccountPopover';
import { LoginPopover } from './LoginPopover';

export function AccountButton() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, close]);

  const toggle = () => setOpen((prev) => !prev);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Account"
        onClick={toggle}
        className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-secondary hover:bg-surface-tertiary transition-colors overflow-hidden"
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : user ? (
          <span className="text-sm font-semibold text-content-primary">
            {getInitials(user.displayName, user.email)}
          </span>
        ) : (
          <svg
            className="w-5 h-5 text-content-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-surface-primary border border-border-primary rounded-lg shadow-lg z-50">
          {user ? (
            <AccountPopover onClose={close} />
          ) : (
            <LoginPopover onClose={close} />
          )}
        </div>
      )}
    </div>
  );
}
