import { AuthForm } from './AuthForm';

interface LoginPopoverProps {
  onClose: () => void;
}

export function LoginPopover({ onClose }: LoginPopoverProps) {
  return (
    <div className="p-md">
      <div className="flex justify-end mb-sm">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-content-secondary hover:text-content-primary"
        >
          &times;
        </button>
      </div>
      <AuthForm />
    </div>
  );
}
