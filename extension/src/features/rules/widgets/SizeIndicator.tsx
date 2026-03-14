import { Badge } from '@/ui/common/Badge';
import { categorizeSize, sizeLabels, type SizeCategory } from '@/ui/theme/tokens';

interface SizeIndicatorProps {
  bytes: number;
}

const categoryColors: Record<SizeCategory, string> = {
  excellent: '#10B981',
  good: '#F59E0B',
  acceptable: '#F97316',
  poor: '#EF4444',
};

export function SizeIndicator({ bytes }: SizeIndicatorProps) {
  const category = categorizeSize(bytes);
  return (
    <Badge color={categoryColors[category]}>
      {formatSize(bytes)} — {sizeLabels[category]}
    </Badge>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
