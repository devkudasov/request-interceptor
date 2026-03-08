import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRulesStore, useCollectionsStore } from '@/shared/store';
import { RuleCard } from '../components/RuleCard';
import { Button } from '@/ui/common/Button';
import { Input } from '@/ui/common/Input';
import { Select } from '@/ui/common/Select';
import { Spinner } from '@/ui/common/Spinner';


const METHOD_OPTIONS = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
];

export function RulesPage() {
  const navigate = useNavigate();
  const { rules, loading, fetchRules, toggleRule, deleteRule } = useRulesStore();
  const { collections, fetchCollections } = useCollectionsStore();
  const [urlFilter, setUrlFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  useEffect(() => {
    fetchRules();
    fetchCollections();
  }, [fetchRules, fetchCollections]);

  const filtered = rules.filter((r) => {
    if (urlFilter && !r.urlPattern.toLowerCase().includes(urlFilter.toLowerCase())) return false;
    if (methodFilter !== 'ALL' && r.method !== methodFilter && r.method !== 'ANY') return false;
    return true;
  });

  const getCollectionName = (id: string | null) =>
    id ? collections.find((c) => c.id === id)?.name : undefined;

  const handleDelete = (id: string) => {
    if (confirm('Delete this rule?')) deleteRule(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2xl">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mock Rules</h2>
        <Button size="sm" onClick={() => navigate('/rules/new')}>
          + New Rule
        </Button>
      </div>

      {rules.length > 0 && (
        <div className="flex gap-sm">
          <div className="flex-1">
            <Input
              placeholder="Filter by URL..."
              value={urlFilter}
              onChange={(e) => setUrlFilter(e.target.value)}
            />
          </div>
          <Select
            options={METHOD_OPTIONS}
            value={methodFilter}
            onChange={setMethodFilter}
          />
        </div>
      )}

      {filtered.length === 0 && rules.length === 0 && (
        <div className="text-center py-2xl text-content-secondary">
          <p className="text-base mb-md">No mock rules yet.</p>
          <p className="text-sm mb-lg">Create your first rule or record real responses.</p>
          <Button onClick={() => navigate('/rules/new')}>Create Rule</Button>
        </div>
      )}

      {filtered.length === 0 && rules.length > 0 && (
        <p className="text-center py-lg text-content-secondary text-base">
          No rules match your filter.
        </p>
      )}

      <div className="flex flex-col gap-sm">
        {filtered.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            collectionName={getCollectionName(rule.collectionId)}
            onToggle={toggleRule}
            onEdit={(id) => navigate(`/rules/${id}/edit`)}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
