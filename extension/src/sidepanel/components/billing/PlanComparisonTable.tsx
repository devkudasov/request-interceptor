import type { AuthPlan } from '@/shared/types';
import { Button } from '@/ui/common/Button';

interface PlanComparisonTableProps {
  currentPlan: AuthPlan;
  onUpgrade: (plan: AuthPlan) => void;
}

interface PlanColumn {
  plan: AuthPlan;
  label: string;
  rules: string;
  collections: string;
  cloudSync: string;
}

const plans: PlanColumn[] = [
  { plan: 'free', label: 'Free', rules: '10', collections: '3', cloudSync: 'No' },
  { plan: 'pro', label: 'Pro', rules: '100', collections: '20', cloudSync: 'Yes' },
  { plan: 'team', label: 'Team', rules: 'Unlimited', collections: '\u221E', cloudSync: 'Yes' },
];

const planOrder: Record<AuthPlan, number> = { free: 0, pro: 1, team: 2 };

export function PlanComparisonTable({ currentPlan, onUpgrade }: PlanComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-sm" />
            {plans.map((p) => (
              <th key={p.plan} className="text-center p-sm font-semibold">
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <td className="p-sm font-medium">Rules</td>
            {plans.map((p) => (
              <td key={p.plan} className="text-center p-sm">{p.rules}</td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="p-sm font-medium">Collections</td>
            {plans.map((p) => (
              <td key={p.plan} className="text-center p-sm">{p.collections}</td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="p-sm font-medium">Cloud Sync</td>
            {plans.map((p) => (
              <td key={p.plan} className="text-center p-sm">{p.cloudSync}</td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="p-sm" />
            {plans.map((p) => (
              <td key={p.plan} className="text-center p-sm">
                {p.plan === currentPlan ? (
                  <span className="text-xs text-content-secondary font-medium">Current Plan</span>
                ) : planOrder[p.plan] > planOrder[currentPlan] ? (
                  <Button variant="primary" size="sm" onClick={() => onUpgrade(p.plan)}>
                    Upgrade
                  </Button>
                ) : null}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
