import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRulesStore, useCollectionsStore } from '@/shared/store';
import { Button } from '@/ui/common/Button';
import { Input } from '@/ui/common/Input';
import { Select } from '@/ui/common/Select';
import { Toggle } from '@/ui/common/Toggle';
import { KeyValueEditor } from '../components/KeyValueEditor';
import { SizeIndicator } from '../components/SizeIndicator';
import type { MockRule, HttpMethod, UrlMatchType, ResponseType, WebSocketMessageRule } from '@/shared/types';

const METHOD_OPTIONS = [
  { value: 'ANY', label: 'ANY' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
];

const MATCH_TYPE_OPTIONS = [
  { value: 'wildcard', label: 'Wildcard' },
  { value: 'regex', label: 'Regex' },
  { value: 'exact', label: 'Exact' },
];

const RESPONSE_TYPE_OPTIONS = [
  { value: 'json', label: 'JSON' },
  { value: 'raw', label: 'Raw Text' },
  { value: 'multipart', label: 'Multipart' },
];

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

const REQUEST_TYPE_OPTIONS = [
  { value: 'http', label: 'HTTP (fetch/XHR)' },
  { value: 'websocket', label: 'WebSocket' },
];

export function RuleEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { rules, createRule, updateRule } = useRulesStore();
  const { collections, fetchCollections } = useCollectionsStore();

  const existingRule = id ? rules.find((r) => r.id === id) : null;
  const isEdit = !!existingRule;

  const [requestType, setRequestType] = useState<'http' | 'websocket'>(existingRule?.requestType ?? 'http');
  const [urlPattern, setUrlPattern] = useState(existingRule?.urlPattern ?? '');
  const [urlMatchType, setUrlMatchType] = useState<UrlMatchType>(existingRule?.urlMatchType ?? 'wildcard');
  const [method, setMethod] = useState<HttpMethod | 'ANY'>(existingRule?.method ?? 'GET');
  const [bodyMatch, setBodyMatch] = useState(existingRule?.bodyMatch ?? '');
  const [graphqlOp, setGraphqlOp] = useState(existingRule?.graphqlOperation ?? '');
  const [statusCode, setStatusCode] = useState(String(existingRule?.statusCode ?? 200));
  const [responseType, setResponseType] = useState<ResponseType>(existingRule?.responseType ?? 'json');
  const [responseBody, setResponseBody] = useState(existingRule?.responseBody ?? '');
  const [headers, setHeaders] = useState<Array<[string, string]>>(
    existingRule?.responseHeaders
      ? Object.entries(existingRule.responseHeaders)
      : [['Content-Type', 'application/json']],
  );
  const [delay, setDelay] = useState(String(existingRule?.delay ?? 0));
  const [collectionId, setCollectionId] = useState(existingRule?.collectionId ?? '');
  const [enabled, setEnabled] = useState(existingRule?.enabled ?? true);

  // WebSocket fields
  const [wsOnConnect, setWsOnConnect] = useState('');
  const [wsMessageRules, setWsMessageRules] = useState<WebSocketMessageRule[]>([]);

  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const bodyBytes = useMemo(() => new Blob([responseBody]).size, [responseBody]);

  const collectionOptions = [
    { value: '', label: 'No Collection' },
    ...collections.map((c) => ({ value: c.id, label: c.name })),
  ];

  const validateJson = (value: string) => {
    if (!value.trim() || responseType !== 'json') {
      setJsonError('');
      return true;
    }
    try {
      JSON.parse(value);
      setJsonError('');
      return true;
    } catch {
      setJsonError('Invalid JSON');
      return false;
    }
  };

  const handleSave = async () => {
    if (!urlPattern.trim()) return;
    if (responseType === 'json' && responseBody.trim() && !validateJson(responseBody)) return;

    const headersObj = Object.fromEntries(headers.filter(([k]) => k.trim()));

    const ruleData = {
      urlPattern,
      urlMatchType,
      method,
      bodyMatch: bodyMatch || undefined,
      graphqlOperation: graphqlOp || undefined,
      requestType,
      statusCode: Number(statusCode),
      responseType,
      responseBody,
      responseHeaders: headersObj,
      delay: Number(delay) || 0,
      collectionId: collectionId || null,
      enabled,
    };

    if (isEdit) {
      await updateRule(id!, ruleData);
    } else {
      await createRule(ruleData as Omit<MockRule, 'id' | 'createdAt' | 'updatedAt' | 'priority'>);
    }

    navigate('/');
  };

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-content-secondary hover:text-content-primary text-base">
          &larr; Back
        </button>
        <h2 className="text-lg font-semibold">
          {isEdit ? 'Edit Rule' : 'Create Rule'}
        </h2>
      </div>

      {/* Request Type */}
      <Select label="Request Type" options={REQUEST_TYPE_OPTIONS} value={requestType} onChange={(v) => setRequestType(v as 'http' | 'websocket')} />

      {/* Request Matching */}
      <fieldset className="border border-border rounded-md p-md">
        <legend className="text-sm font-semibold text-content-secondary px-xs">Request Matching</legend>

        <div className="flex flex-col gap-sm">
          <Input label="URL Pattern" value={urlPattern} onChange={(e) => setUrlPattern(e.target.value)} placeholder="**/api/users" />

          <Select label="Match Type" options={MATCH_TYPE_OPTIONS} value={urlMatchType} onChange={(v) => setUrlMatchType(v as UrlMatchType)} />

          {requestType === 'http' && (
            <>
              <Select label="Method" options={METHOD_OPTIONS} value={method} onChange={(v) => setMethod(v as HttpMethod | 'ANY')} />

              <div className="flex flex-col gap-xs">
                <label className="text-sm font-medium text-content-secondary">Request Body Match (optional)</label>
                <textarea
                  className="px-md py-sm text-sm bg-surface-secondary text-content-primary border border-border rounded-md font-mono resize-y min-h-[60px]"
                  placeholder='{"email": "*"}'
                  value={bodyMatch}
                  onChange={(e) => setBodyMatch(e.target.value)}
                />
              </div>

              <Input label="GraphQL Operation (optional)" value={graphqlOp} onChange={(e) => setGraphqlOp(e.target.value)} placeholder="GetUsers" />
            </>
          )}
        </div>
      </fieldset>

      {/* Response */}
      {requestType === 'http' && (
        <fieldset className="border border-border rounded-md p-md">
          <legend className="text-sm font-semibold text-content-secondary px-xs">Response</legend>

          <div className="flex flex-col gap-sm">
            <Select label="Status Code" options={STATUS_OPTIONS} value={statusCode} onChange={setStatusCode} />

            <Select label="Response Type" options={RESPONSE_TYPE_OPTIONS} value={responseType} onChange={(v) => setResponseType(v as ResponseType)} />

            <div className="flex flex-col gap-xs">
              <label className="text-sm font-medium text-content-secondary">Response Body</label>
              <textarea
                className={`px-md py-sm text-sm bg-surface-secondary text-content-primary border rounded-md font-mono resize-y min-h-[120px] ${
                  jsonError ? 'border-status-error' : 'border-border'
                }`}
                value={responseBody}
                onChange={(e) => {
                  setResponseBody(e.target.value);
                  validateJson(e.target.value);
                }}
                placeholder='{"users": []}'
              />
              {jsonError && <span className="text-sm text-status-error">{jsonError}</span>}
              {responseBody && <SizeIndicator bytes={bodyBytes} />}
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-sm font-medium text-content-secondary">Response Headers</label>
              <KeyValueEditor entries={headers} onChange={setHeaders} keyPlaceholder="Header" valuePlaceholder="Value" />
            </div>

            <Input label="Delay (ms)" type="number" value={delay} onChange={(e) => setDelay(e.target.value)} placeholder="0" />
          </div>
        </fieldset>
      )}

      {/* WebSocket */}
      {requestType === 'websocket' && (
        <fieldset className="border border-border rounded-md p-md">
          <legend className="text-sm font-semibold text-content-secondary px-xs">WebSocket Mock</legend>

          <div className="flex flex-col gap-sm">
            <div className="flex flex-col gap-xs">
              <label className="text-sm font-medium text-content-secondary">On Connect Message</label>
              <textarea
                className="px-md py-sm text-sm bg-surface-secondary text-content-primary border border-border rounded-md font-mono resize-y min-h-[60px]"
                value={wsOnConnect}
                onChange={(e) => setWsOnConnect(e.target.value)}
                placeholder='{"status": "connected"}'
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-sm font-medium text-content-secondary">Message Rules</label>
              {wsMessageRules.map((mr, i) => (
                <div key={i} className="flex flex-col gap-xs border border-border rounded p-sm">
                  <input
                    className="px-sm py-xs text-sm bg-surface-secondary text-content-primary border border-border rounded font-mono"
                    placeholder='Match: {"type": "*"}'
                    value={mr.match}
                    onChange={(e) => {
                      const copy = [...wsMessageRules];
                      copy[i] = { ...copy[i], match: e.target.value };
                      setWsMessageRules(copy);
                    }}
                  />
                  <input
                    className="px-sm py-xs text-sm bg-surface-secondary text-content-primary border border-border rounded font-mono"
                    placeholder='Respond: {"data": []}'
                    value={mr.respond}
                    onChange={(e) => {
                      const copy = [...wsMessageRules];
                      copy[i] = { ...copy[i], respond: e.target.value };
                      setWsMessageRules(copy);
                    }}
                  />
                  <div className="flex items-center gap-sm">
                    <Input
                      type="number"
                      placeholder="Delay (ms)"
                      value={String(mr.delay)}
                      onChange={(e) => {
                        const copy = [...wsMessageRules];
                        copy[i] = { ...copy[i], delay: Number(e.target.value) || 0 };
                        setWsMessageRules(copy);
                      }}
                      className="flex-1"
                    />
                    <button
                      onClick={() => setWsMessageRules(wsMessageRules.filter((_, j) => j !== i))}
                      className="text-content-muted hover:text-status-error text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setWsMessageRules([...wsMessageRules, { match: '', respond: '', delay: 0 }])}>
                + Add Message Rule
              </Button>
            </div>
          </div>
        </fieldset>
      )}

      {/* Organization */}
      <fieldset className="border border-border rounded-md p-md">
        <legend className="text-sm font-semibold text-content-secondary px-xs">Organization</legend>
        <div className="flex flex-col gap-sm">
          <Select label="Collection" options={collectionOptions} value={collectionId} onChange={setCollectionId} />
          <Toggle checked={enabled} onChange={setEnabled} label="Enabled" />
        </div>
      </fieldset>

      {/* Actions */}
      <div className="flex justify-end gap-sm">
        <Button variant="secondary" onClick={() => navigate('/')}>Cancel</Button>
        <Button onClick={handleSave} disabled={!urlPattern.trim() || !!jsonError}>
          {isEdit ? 'Save Changes' : 'Create Rule'}
        </Button>
      </div>
    </div>
  );
}
