import { MethodDropdown } from './MethodDropdown';
import { MatchTypeDropdown } from './MatchTypeDropdown';
import type { HttpMethod, UrlMatchType, RequestType } from '@/features/rules';

interface RuleInputBarProps {
  method: HttpMethod | 'ANY';
  onMethodChange: (method: HttpMethod | 'ANY') => void;
  urlPattern: string;
  onUrlPatternChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  urlMatchType: UrlMatchType;
  onUrlMatchTypeChange: (matchType: UrlMatchType) => void;
  requestType?: RequestType;
  disabled?: boolean;
  autoFocusUrl?: boolean;
  urlError?: string;
}

export function RuleInputBar({
  method,
  onMethodChange,
  urlPattern,
  onUrlPatternChange,
  urlMatchType,
  onUrlMatchTypeChange,
  requestType = 'http',
  disabled,
  autoFocusUrl,
  urlError,
}: RuleInputBarProps) {
  const isWebSocket = requestType === 'websocket';

  return (
    <div role="group" aria-label="Request URL configuration" className="flex flex-col">
      <div
        className={`flex items-stretch border rounded-md h-9 ${
          urlError ? 'border-status-error' : 'border-border'
        } focus-within:ring-2 focus-within:ring-primary`}
      >
        {isWebSocket ? (
          <div className="flex items-center justify-center px-sm min-w-[60px] text-sm font-semibold rounded-l-md border-r border-border bg-status-info/15 text-status-info">
            WS
          </div>
        ) : (
          <MethodDropdown value={method} onChange={onMethodChange} disabled={disabled} />
        )}

        <input
          type="text"
          role="textbox"
          aria-label="URL pattern"
          value={urlPattern}
          onChange={onUrlPatternChange}
          placeholder="Enter URL pattern..."
          disabled={disabled}
          autoFocus={autoFocusUrl}
          className="flex-1 min-w-0 px-sm font-mono text-base bg-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <MatchTypeDropdown value={urlMatchType} onChange={onUrlMatchTypeChange} disabled={disabled} />
      </div>

      {urlError && (
        <p className="text-status-error text-xs mt-xs">{urlError}</p>
      )}
    </div>
  );
}
