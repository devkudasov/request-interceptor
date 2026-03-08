import { useState } from 'react';
import { RuleInputBar } from './RuleInputBar';
import { ResponseConfig } from './ResponseConfig';
import { Input } from '@/ui/common/Input';
import type { HttpMethod, UrlMatchType, ResponseType } from '@/shared/types';

export interface GraphQLRuleFields {
  method: HttpMethod | 'ANY';
  urlPattern: string;
  urlMatchType: UrlMatchType;
  graphqlOperation: string;
  bodyMatch: string;
  statusCode: string;
  responseType: ResponseType;
  responseBody: string;
  headers: Array<[string, string]>;
  delay: string;
}

interface GraphQLRuleEditorProps {
  fields: GraphQLRuleFields;
  onChange: (fields: Partial<GraphQLRuleFields>) => void;
  isNew?: boolean;
}

export function GraphQLRuleEditor({ fields, onChange, isNew }: GraphQLRuleEditorProps) {
  const [jsonError, setJsonError] = useState('');

  const validateJson = (value: string) => {
    if (!value.trim() || fields.responseType !== 'json') {
      setJsonError('');
      return;
    }
    try {
      JSON.parse(value);
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  return (
    <div className="flex flex-col gap-md">
      <RuleInputBar
        method={fields.method}
        onMethodChange={(method) => onChange({ method })}
        urlPattern={fields.urlPattern}
        onUrlPatternChange={(e) => onChange({ urlPattern: e.target.value })}
        urlMatchType={fields.urlMatchType}
        onUrlMatchTypeChange={(urlMatchType) => onChange({ urlMatchType })}
        requestType="http"
        autoFocusUrl={isNew}
      />

      <Input
        label="GraphQL Operation"
        value={fields.graphqlOperation}
        onChange={(e) => onChange({ graphqlOperation: e.target.value })}
        placeholder="GetUsers, CreatePost, etc."
      />

      <details className="group">
        <summary className="text-sm font-medium text-content-secondary cursor-pointer select-none hover:text-content-primary">
          Advanced Matching
        </summary>
        <div className="flex flex-col gap-sm mt-sm">
          <div className="flex flex-col gap-xs">
            <label className="text-sm font-medium text-content-secondary">
              Request Body Match (optional)
            </label>
            <textarea
              className="px-md py-sm text-sm bg-surface-secondary text-content-primary border border-border rounded-md font-mono resize-y min-h-[60px]"
              placeholder='{"query": "{ users { id name } }"}'
              value={fields.bodyMatch}
              onChange={(e) => onChange({ bodyMatch: e.target.value })}
            />
          </div>
        </div>
      </details>

      <div className="bg-surface-card border border-border rounded-md p-md">
        <h3 className="text-sm font-semibold text-content-secondary mb-sm">Response</h3>
        <ResponseConfig
          statusCode={fields.statusCode}
          onStatusCodeChange={(statusCode) => onChange({ statusCode })}
          responseType={fields.responseType}
          onResponseTypeChange={(v) => onChange({ responseType: v as ResponseType })}
          responseBody={fields.responseBody}
          onResponseBodyChange={(e) => {
            onChange({ responseBody: e.target.value });
            validateJson(e.target.value);
          }}
          headers={fields.headers}
          onHeadersChange={(headers) => onChange({ headers })}
          delay={fields.delay}
          onDelayChange={(e) => onChange({ delay: e.target.value })}
          jsonError={jsonError}
        />
      </div>
    </div>
  );
}
