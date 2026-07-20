/**
 * Centralized PII Redaction/Masking Utilities for Demo Mode.
 * Only modifies display values when enabled is true.
 */

export function maskName(name: string | null | undefined, enabled: boolean): string {
  if (!name) return '';
  if (!enabled) return name;

  return name
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 1) return word;
      return word[0] + '*'.repeat(word.length - 1);
    })
    .join(' ');
}

export function maskEmail(email: string | null | undefined, enabled: boolean): string {
  if (!email) return '';
  if (!enabled) return email;

  const parts = email.split('@');
  if (parts.length !== 2) return email;

  const [username, domain] = parts;
  if (username.length <= 3) {
    return username[0] + '*'.repeat(username.length - 1) + '@' + domain;
  }

  return username.slice(0, 3) + '*'.repeat(username.length - 3) + '@' + domain;
}

export function maskPhone(phone: string | null | undefined, enabled: boolean): string {
  if (!phone) return '';
  if (!enabled) return phone;

  const clean = phone.replace(/[-\s]/g, '');
  if (clean.length <= 8) {
    return '*'.repeat(clean.length);
  }

  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-4);
  return `${prefix}-****-${suffix}`;
}

export function maskAddress(address: string | null | undefined, enabled: boolean): string {
  if (!address) return '';
  if (!enabled) return address;

  // Check for common Indonesian/English road prefixes
  const roadRegex = /^(jl\.?|jalan)\s+(.+)$/i;
  const match = address.match(roadRegex);
  if (match) {
    const prefix = match[1];
    return `${prefix} ********`;
  }

  return '********';
}

export function maskNationalId(id: string | null | undefined, enabled: boolean): string {
  if (!id) return '';
  if (!enabled) return id;

  if (id.length <= 4) {
    return '*'.repeat(id.length);
  }

  return '*'.repeat(id.length - 4) + id.slice(-4);
}
