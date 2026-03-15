import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useRulesStore } from '@/features/rules';
import { useCollectionsStore } from '@/features/collections';
import { Button } from '@/ui/common/Button';
import { Select } from '@/ui/common/Select';
import { Toggle } from '@/ui/common/Toggle';
import { RequestTypeTabs } from '@/features/workspace-ui/widgets/RequestTypeTabs';
import type { RequestTypeTab } from '@/features/workspace-ui/widgets/RequestTypeTabs';
import { HttpRuleEditor } from '@/features/rules/widgets/HttpRuleEditor';
import type { HttpRuleFields } from '@/features/rules/widgets/HttpRuleEditor';
import { WebSocketRuleEditor } from '@/features/rules/widgets/WebSocketRuleEditor';
import type { WebSocketRuleFields } from '@/features/rules/widgets/WebSocketRuleEditor';
import { GraphQLRuleEditor } from '@/features/rules/widgets/GraphQLRuleEditor';
import type { GraphQLRuleFields } from '@/features/rules/widgets/GraphQLRuleEditor';
import type { MockRule } from '@/features/rules';
import type { LogEntry } from '@/features/logging';

function detectTab(rule: MockRule | null): RequestTypeTab {
  if (!rule) return 'http';
  if (rule.requestType === 'websocket') return 'websocket';
  if (rule.graphqlOperation) return 'graphql';
  return 'http';
}

function httpMethodOrAny(method: string): MockRule['method'] {
  const valid = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'ANY'];
  return valid.includes(method) ? (method as MockRule['method']) : 'ANY';
}

export function RuleEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { rules, createRule, updateRule } = useRulesStore();
  const { collections, fetchCollections } = useCollectionsStore();

  const existingRule = id ? rules.find((r) => r.id === id) : null;
  const isEdit = !!existingRule;
  const prefill = (location.state as { fromLogEntry?: LogEntry } | null)?.fromLogEntry;

  const [activeTab, setActiveTab] = useState<RequestTypeTab>(detectTab(existingRule ?? null));

  const [httpFields, setHttpFields] = useState<HttpRuleFields>({
    method: existingRule?.method ?? httpMethodOrAny(prefill?.method ?? 'GET'),
    urlPattern: existingRule?.urlPattern ?? prefill?.url ?? '',
    urlMatchType: existingRule?.urlMatchType ?? 'wildcard',
    bodyMatch: existingRule?.bodyMatch ?? '',
    statusCode: String(existingRule?.statusCode ?? prefill?.statusCode ?? 200),
    responseType: existingRule?.responseType ?? 'json',
    responseBody: existingRule?.responseBody ?? prefill?.responseBody ?? '',
    headers: existingRule?.responseHeaders
      ? Object.entries(existingRule.responseHeaders)
      : prefill?.responseHeaders && Object.keys(prefill.responseHeaders).length > 0
        ? Object.entries(prefill.responseHeaders)
        : [['Content-Type', 'application/json']],
    delay: String(existingRule?.delay ?? 0),
  });

  const [wsFields, setWsFields] = useState<WebSocketRuleFields>({
    urlPattern: existingRule?.urlPattern ?? '',
    urlMatchType: existingRule?.urlMatchType ?? 'wildcard',
    wsOnConnect: '',
    wsMessageRules: [],
  });

  const [gqlFields, setGqlFields] = useState<GraphQLRuleFields>({
    method: existingRule?.method ?? 'POST',
    urlPattern: existingRule?.urlPattern ?? '/graphql',
    urlMatchType: existingRule?.urlMatchType ?? 'wildcard',
    graphqlOperation: existingRule?.graphqlOperation ?? '',
    bodyMatch: existingRule?.bodyMatch ?? '',
    statusCode: String(existingRule?.statusCode ?? 200),
    responseType: existingRule?.responseType ?? 'json',
    responseBody: existingRule?.responseBody ?? '',
    headers: existingRule?.responseHeaders
      ? Object.entries(existingRule.responseHeaders)
      : [['Content-Type', 'application/json']],
    delay: String(existingRule?.delay ?? 0),
  });

  const [collectionId, setCollectionId] = useState(existingRule?.collectionId ?? '');
  const [enabled, setEnabled] = useState(existingRule?.enabled ?? true);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const collectionOptions = [
    { value: '', label: 'No Collection' },
    ...collections.map((c) => ({ value: c.id, label: c.name })),
  ];

  const canSave = () => {
    if (activeTab === 'http') return !!httpFields.urlPattern.trim();
    if (activeTab === 'websocket') return !!wsFields.urlPattern.trim();
    if (activeTab === 'graphql') return !!gqlFields.urlPattern.trim();
    return false;
  };

  const handleSave = async () => {
    if (!canSave()) return;

    let ruleData: Partial<MockRule>;

    if (activeTab === 'http') {
      const headersObj = Object.fromEntries(httpFields.headers.filter(([k]) => k.trim()));
      ruleData = {
        requestType: 'http',
        method: httpFields.method,
        urlPattern: httpFields.urlPattern,
        urlMatchType: httpFields.urlMatchType,
        bodyMatch: httpFields.bodyMatch || undefined,
        statusCode: Number(httpFields.statusCode),
        responseType: httpFields.responseType,
        responseBody: httpFields.responseBody,
        responseHeaders: headersObj,
        delay: Number(httpFields.delay) || 0,
      };
    } else if (activeTab === 'websocket') {
      ruleData = {
        requestType: 'websocket',
        method: 'GET',
        urlPattern: wsFields.urlPattern,
        urlMatchType: wsFields.urlMatchType,
        statusCode: 101,
        responseType: 'raw',
        responseBody: '',
        responseHeaders: {},
        delay: 0,
      };
    } else {
      const headersObj = Object.fromEntries(gqlFields.headers.filter(([k]) => k.trim()));
      ruleData = {
        requestType: 'http',
        method: gqlFields.method,
        urlPattern: gqlFields.urlPattern,
        urlMatchType: gqlFields.urlMatchType,
        graphqlOperation: gqlFields.graphqlOperation || undefined,
        bodyMatch: gqlFields.bodyMatch || undefined,
        statusCode: Number(gqlFields.statusCode),
        responseType: gqlFields.responseType,
        responseBody: gqlFields.responseBody,
        responseHeaders: headersObj,
        delay: Number(gqlFields.delay) || 0,
      };
    }

    ruleData.collectionId = collectionId || null;
    ruleData.enabled = enabled;

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

      {!isEdit && (
        <RequestTypeTabs
          active={activeTab}
          onChange={setActiveTab}
          counts={{ http: 0, websocket: 0, graphql: 0 }}
        />
      )}

      {activeTab === 'http' && (
        <HttpRuleEditor
          fields={httpFields}
          onChange={(update) => setHttpFields((prev) => ({ ...prev, ...update }))}
          isNew={!isEdit}
        />
      )}

      {activeTab === 'websocket' && (
        <WebSocketRuleEditor
          fields={wsFields}
          onChange={(update) => setWsFields((prev) => ({ ...prev, ...update }))}
          isNew={!isEdit}
        />
      )}

      {activeTab === 'graphql' && (
        <GraphQLRuleEditor
          fields={gqlFields}
          onChange={(update) => setGqlFields((prev) => ({ ...prev, ...update }))}
          isNew={!isEdit}
        />
      )}

      <details open className="group">
        <summary className="text-sm font-medium text-content-secondary cursor-pointer select-none hover:text-content-primary">
          Organization
        </summary>
        <div className="flex flex-col gap-sm mt-sm">
          <Select label="Collection" options={collectionOptions} value={collectionId} onChange={setCollectionId} />
          <Toggle checked={enabled} onChange={setEnabled} label="Enabled" />
        </div>
      </details>

      <div className="flex justify-end gap-sm">
        <Button variant="secondary" onClick={() => navigate('/')}>Cancel</Button>
        <Button onClick={handleSave} disabled={!canSave()}>
          {isEdit ? 'Save Changes' : 'Create Rule'}
        </Button>
      </div>
    </div>
  );
}
