export interface AffiliationOption {
  value: string;
  label: string;
}

export const AFFILIATION_OPTIONS: AffiliationOption[] = [
  { value: 'security', label: 'Security Staff' },
  { value: 'secretariat', label: 'Secretariat Admin' },
  { value: 'vendor', label: 'Vendor / Contractor' },
  { value: 'assistant', label: 'Resident\'s Assistant' },
  { value: 'contractor', label: 'Independent Contractor' },
  { value: 'other', label: 'Other / Support Staff' }
];

export const getAffiliationLabel = (value: string): string => {
  const option = AFFILIATION_OPTIONS.find(o => o.value === value);
  return option ? option.label : value;
};
