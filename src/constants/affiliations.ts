export interface AffiliationOption {
  value: string;
  label: string;
}

export const AFFILIATION_OPTIONS: AffiliationOption[] = [
  { value: 'secretariat', label: 'Secretariat Admin' },
  { value: 'security', label: 'Security Staff' },
  { value: 'vendor', label: 'Vendor / Provider' },
  { value: 'assistant', label: 'Resident\'s Assistant' }
];

export const getAffiliationLabel = (value: string): string => {
  const option = AFFILIATION_OPTIONS.find(o => o.value === value);
  return option ? option.label : value;
};
