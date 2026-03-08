import type { MockRule, Collection } from './types';

export interface ExportData {
  version: 1;
  exportedAt: string;
  collections: Array<Collection & { rules: MockRule[] }>;
}

export function exportCollections(
  collections: Collection[],
  rules: MockRule[],
  selectedIds?: string[],
): ExportData {
  const targetCollections = selectedIds
    ? collections.filter((c) => selectedIds.includes(c.id))
    : collections;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: targetCollections.map((col) => ({
      ...col,
      rules: rules.filter((r) => r.collectionId === col.id),
    })),
  };
}

export function downloadJson(data: ExportData, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  collections: Collection[];
  rules: MockRule[];
  conflicts: Array<{ type: 'collection'; name: string; existingId: string; importedId: string }>;
}

export function parseImportFile(json: string, existingCollections: Collection[]): ImportResult {
  const data = JSON.parse(json) as ExportData;

  if (!data.version || !Array.isArray(data.collections)) {
    throw new Error('Invalid import file format');
  }

  const collections: Collection[] = [];
  const rules: MockRule[] = [];
  const conflicts: ImportResult['conflicts'] = [];

  for (const col of data.collections) {
    const existing = existingCollections.find((c) => c.name === col.name);
    if (existing) {
      conflicts.push({
        type: 'collection',
        name: col.name,
        existingId: existing.id,
        importedId: col.id,
      });
    }

    const { rules: colRules, ...collectionData } = col;
    collections.push(collectionData);
    rules.push(...colRules);
  }

  return { collections, rules, conflicts };
}

export type ConflictResolution = 'merge' | 'replace' | 'skip';

export function resolveConflicts(
  importResult: ImportResult,
  resolutions: Map<string, ConflictResolution>,
  existingCollections: Collection[],
  existingRules: MockRule[],
): { collections: Collection[]; rules: MockRule[] } {
  const finalCollections = [...existingCollections];
  const finalRules = [...existingRules];

  for (const col of importResult.collections) {
    const conflict = importResult.conflicts.find((c) => c.importedId === col.id);

    if (!conflict) {
      finalCollections.push(col);
      const colRules = importResult.rules.filter((r) => r.collectionId === col.id);
      finalRules.push(...colRules);
      continue;
    }

    const resolution = resolutions.get(conflict.importedId) ?? 'skip';

    if (resolution === 'skip') continue;

    if (resolution === 'replace') {
      const idx = finalCollections.findIndex((c) => c.id === conflict.existingId);
      if (idx >= 0) finalCollections[idx] = { ...col, id: conflict.existingId };
      // Remove old rules, add imported ones with updated collectionId
      const colRules = importResult.rules
        .filter((r) => r.collectionId === col.id)
        .map((r) => ({ ...r, collectionId: conflict.existingId }));
      const filtered = finalRules.filter((r) => r.collectionId !== conflict.existingId);
      filtered.push(...colRules);
      finalRules.length = 0;
      finalRules.push(...filtered);
    }

    if (resolution === 'merge') {
      // Add imported rules to existing collection
      const colRules = importResult.rules
        .filter((r) => r.collectionId === col.id)
        .map((r) => ({ ...r, collectionId: conflict.existingId }));
      finalRules.push(...colRules);
    }
  }

  return { collections: finalCollections, rules: finalRules };
}
