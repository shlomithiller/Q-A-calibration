export interface SemanticModelRecord {
  id: string;
  apiName: string;
  displayName: string;
}

export const semanticModels: SemanticModelRecord[] = [
  { id: 'sdm_c360', apiName: 'c360', displayName: 'C360' },
  { id: 'sdm_sales', apiName: 'sales', displayName: 'Sales' },
  { id: 'sdm_marketing', apiName: 'marketing', displayName: 'Marketing' },
  { id: 'sdm_support', apiName: 'support', displayName: 'Support' },
];

export type SdmResolution =
  | { ok: true; displayName: string }
  | { ok: false; reason: string };

export function resolveSemanticModel(value: string): SdmResolution {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return { ok: false, reason: 'SDM is required' };

  const matched = semanticModels.find(
    (model) => model.id.toLowerCase() === normalized || model.apiName.toLowerCase() === normalized,
  );
  const displayOnly = semanticModels.find((model) => model.displayName.toLowerCase() === normalized);
  if (!matched && displayOnly) {
    return { ok: false, reason: 'Display names are not accepted. Use the SDM id or API name.' };
  }
  if (!matched) return { ok: false, reason: 'SDM not found' };
  return { ok: true, displayName: matched.displayName };
}
