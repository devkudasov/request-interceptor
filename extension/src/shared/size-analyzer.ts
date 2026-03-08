import type { SizeCategory } from '@/ui/theme/tokens';
import { categorizeSize } from '@/ui/theme/tokens';

export function analyzeResponseSize(body: string): {
  bytes: number;
  category: SizeCategory;
  label: string;
} {
  const bytes = new Blob([body]).size;
  const category = categorizeSize(bytes);
  const label = formatBytes(bytes);
  return { bytes, category, label };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
