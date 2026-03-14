import { useMemo } from 'react';
import { Select } from '@/ui/common/Select';
import { Input } from '@/ui/common/Input';
import { KeyValueEditor } from './KeyValueEditor';
import { SizeIndicator } from './SizeIndicator';
import type { ResponseType } from '@/features/rules';

const STATUS_OPTIONS = [
  { value: '200', label: '200 OK' },
  { value: '201', label: '201 Created' },
  { value: '204', label: '204 No Content' },
  { value: '400', label: '400 Bad Request' },
  { value: '401', label: '401 Unauthorized' },
  { value: '403', label: '403 Forbidden' },
  { value: '404', label: '404 Not Found' },
  { value: '422', label: '422 Unprocessable Entity' },
  { value: '429', label: '429 Too Many Requests' },
  { value: '500', label: '500 Internal Server Error' },
  { value: '502', label: '502 Bad Gateway' },
  { value: '503', label: '503 Service Unavailable' },
];

const RESPONSE_TYPE_OPTIONS = [
  { value: 'json', label: 'JSON' },
  { value: 'raw', label: 'Raw Text' },
  { value: 'multipart', label: 'Multipart' },
];

interface ResponseConfigProps {
  statusCode: string;
  onStatusCodeChange: (value: string) => void;
  responseType: ResponseType;
  onResponseTypeChange: (value: string) => void;
  responseBody: string;
  onResponseBodyChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  headers: Array<[string, string]>;
  onHeadersChange: (entries: Array<[string, string]>) => void;
  delay: string;
  onDelayChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  jsonError?: string;
}

export function ResponseConfig({
  statusCode,
  onStatusCodeChange,
  responseType,
  onResponseTypeChange,
  responseBody,
  onResponseBodyChange,
  headers,
  onHeadersChange,
  delay,
  onDelayChange,
  jsonError,
}: ResponseConfigProps) {
  const bodyBytes = useMemo(() => new Blob([responseBody]).size, [responseBody]);

  return (
    <div className="flex flex-col gap-sm">
      <Select label="Status Code" options={STATUS_OPTIONS} value={statusCode} onChange={onStatusCodeChange} />

      <Select label="Response Type" options={RESPONSE_TYPE_OPTIONS} value={responseType} onChange={onResponseTypeChange} />

      <div className="flex flex-col gap-xs">
        <label htmlFor="response-body" className="text-sm font-medium text-content-secondary">
          Response Body
        </label>
        <textarea
          id="response-body"
          className={`px-md py-sm text-sm bg-surface-secondary text-content-primary border rounded-md font-mono resize-y min-h-[120px] ${
            jsonError ? 'border-status-error' : 'border-border'
          }`}
          value={responseBody}
          onChange={onResponseBodyChange}
          placeholder='{"users": []}'
        />
        {jsonError && <span className="text-sm text-status-error">{jsonError}</span>}
        {responseBody && <SizeIndicator bytes={bodyBytes} />}
      </div>

      <div className="flex flex-col gap-xs">
        <label className="text-sm font-medium text-content-secondary">Response Headers</label>
        <KeyValueEditor entries={headers} onChange={onHeadersChange} keyPlaceholder="Header" valuePlaceholder="Value" />
      </div>

      <Input label="Delay (ms)" type="number" value={delay} onChange={onDelayChange} placeholder="0" />
    </div>
  );
}
