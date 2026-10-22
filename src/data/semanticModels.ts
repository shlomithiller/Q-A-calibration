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
