import { RuleInputBar } from './RuleInputBar';
import { Button } from '@/ui/common/Button';
import { Input } from '@/ui/common/Input';
import type { UrlMatchType, WebSocketMessageRule } from '@/shared/types';

export interface WebSocketRuleFields {
  urlPattern: string;
  urlMatchType: UrlMatchType;
  wsOnConnect: string;
  wsMessageRules: WebSocketMessageRule[];
}

interface WebSocketRuleEditorProps {
  fields: WebSocketRuleFields;
  onChange: (fields: Partial<WebSocketRuleFields>) => void;
  isNew?: boolean;
}

export function WebSocketRuleEditor({ fields, onChange, isNew }: WebSocketRuleEditorProps) {
  const updateMessageRule = (index: number, update: Partial<WebSocketMessageRule>) => {
    const copy = [...fields.wsMessageRules];
    copy[index] = { ...copy[index], ...update };
    onChange({ wsMessageRules: copy });
  };

  const removeMessageRule = (index: number) => {
    onChange({ wsMessageRules: fields.wsMessageRules.filter((_, i) => i !== index) });
  };

  const addMessageRule = () => {
    onChange({ wsMessageRules: [...fields.wsMessageRules, { match: '', respond: '', delay: 0 }] });
  };

  return (
    <div className="flex flex-col gap-md">
      <RuleInputBar
        method="GET"
        onMethodChange={() => {}}
        urlPattern={fields.urlPattern}
        onUrlPatternChange={(e) => onChange({ urlPattern: e.target.value })}
        urlMatchType={fields.urlMatchType}
        onUrlMatchTypeChange={(urlMatchType) => onChange({ urlMatchType })}
        requestType="websocket"
        autoFocusUrl={isNew}
      />

      <div className="bg-surface-card border border-border rounded-md p-md">
        <h3 className="text-sm font-semibold text-content-secondary mb-sm">WebSocket Mock</h3>
        <div className="flex flex-col gap-sm">
          <div className="flex flex-col gap-xs">
            <label className="text-sm font-medium text-content-secondary">On Connect Message</label>
            <textarea
              className="px-md py-sm text-sm bg-surface-secondary text-content-primary border border-border rounded-md font-mono resize-y min-h-[60px]"
              value={fields.wsOnConnect}
              onChange={(e) => onChange({ wsOnConnect: e.target.value })}
              placeholder='{"status": "connected"}'
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="text-sm font-medium text-content-secondary">Message Rules</label>
            {fields.wsMessageRules.map((mr, i) => (
              <div key={i} className="flex flex-col gap-xs border border-border rounded p-sm">
                <input
                  className="px-sm py-xs text-sm bg-surface-secondary text-content-primary border border-border rounded font-mono"
                  placeholder='Match: {"type": "*"}'
                  value={mr.match}
                  onChange={(e) => updateMessageRule(i, { match: e.target.value })}
                />
                <input
                  className="px-sm py-xs text-sm bg-surface-secondary text-content-primary border border-border rounded font-mono"
                  placeholder='Respond: {"data": []}'
                  value={mr.respond}
                  onChange={(e) => updateMessageRule(i, { respond: e.target.value })}
                />
                <div className="flex items-center gap-sm">
                  <Input
                    type="number"
                    placeholder="Delay (ms)"
                    value={String(mr.delay)}
                    onChange={(e) => updateMessageRule(i, { delay: Number(e.target.value) || 0 })}
                    className="flex-1"
                  />
                  <button
                    onClick={() => removeMessageRule(i)}
                    className="text-content-muted hover:text-status-error text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addMessageRule}>
              + Add Message Rule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
