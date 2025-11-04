import { IIdentity as IPickerIdentity, IdentityType } from 'azure-devops-ui/IdentityPicker';

/** Normalize a string for identity comparisons (case-insensitive, trimmed). */
export function normalizeIdentityToken(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

/** Optional normalization returning undefined for empty values. */
export function normalizeIdentityValue(value?: string | null): string | undefined {
  const token = normalizeIdentityToken(value);
  return token ? token : undefined;
}

/** Find identity by displayName or mail (case-insensitive). */
export function findIdentityByNameOrMail(identities: IPickerIdentity[], rawInput: string): IPickerIdentity | undefined {
  const needle = normalizeIdentityToken(rawInput);
  if (!needle) return undefined;
  for (const identity of identities) {
    if (normalizeIdentityToken(identity.displayName) === needle || normalizeIdentityToken(identity.mail) === needle) {
      return identity;
    }
  }
  return undefined;
}

// ---- Custom Identity Creation Utilities (moved from memberUtils) ----
export function createCustomIdentity(name: string, customId?: string): IPickerIdentity {
  const trimmed = name.trim();
  const entityId = customId ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    entityId,
    displayName: trimmed,
    entityType: IdentityType.Custom,
    originDirectory: 'custom',
    originId: entityId
  };
}

export function normalizeCustomIdentityId(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const sanitized = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized ? `custom-${sanitized}` : `custom-${Date.now().toString(36)}`;
}

export function createCustomIdentityFromInput(name: string): IPickerIdentity {
  return createCustomIdentity(name, normalizeCustomIdentityId(name));
}

export function isUserIdentity(identity?: IPickerIdentity | null): identity is IPickerIdentity {
  if (!identity) return false;
  const type = identity.entityType?.toLowerCase();
  return type === IdentityType.User || type === 'user';
}

export function isCustomIdentity(identity?: IPickerIdentity | null): identity is IPickerIdentity {
  if (!identity) return false;
  const type = identity.entityType?.toLowerCase();
  return type === IdentityType.Custom || type === 'custom';
}
