export const SYNC_STATUS = Object.freeze({
  localOnly: 'local-only',
  connected: 'connected'
});

export function syncRequirements() {
  return [
    { title: 'Authenticated accounts', required: true },
    { title: 'Encrypted database', required: true },
    { title: 'Conflict resolution', required: true },
    { title: 'Audit and restore', required: true },
    { title: 'End-to-end encryption option', required: false }
  ];
}

export function canEnableCloudSync({ hasAuth = false, hasDatabase = false, hasConflictResolution = false, hasAuditRestore = false } = {}) {
  return Boolean(hasAuth && hasDatabase && hasConflictResolution && hasAuditRestore);
}

export function pinMeetsPolicy(pin) {
  return /^\d{4,}$/.test(String(pin || '').trim());
}
