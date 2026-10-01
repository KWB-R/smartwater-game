type LevelRef = {
  documentId?: string;
  id?: number | string;
  name?: string;
  label?: string;
  connect?: LevelRef[];
  data?: LevelRef | LevelRef[] | null;
};

function asRecord(value: unknown): LevelRef | null {
  if (value == null || typeof value !== 'object') {
    return null;
  }
  return value as LevelRef;
}

/**
 * Ermittelt einen lesbaren Levelnamen aus einer Beziehung:
 * aus geladenen Daten, connect-/disconnect-Listen oder einer id/documentId.
 */
export function levelRelationToName(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string' && value.length > 0) {
    // Eine Zeichenkette kann ein Name oder eine documentId sein. Alphanumerische Werte
    // zuerst nachschlagen, statt sie ungeprüft als Anzeigenamen zu übernehmen.
    return null;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  if (typeof record.label === 'string' && record.label.length > 0) {
    return record.label;
  }

  if (typeof record.name === 'string' && record.name.length > 0) {
    return record.name;
  }

  if (Array.isArray(record.connect) && record.connect.length > 0) {
    return levelRelationToName(record.connect[0]);
  }

  if (record.data != null) {
    return levelRelationToName(record.data);
  }

  return null;
}

export function levelRelationToDocumentId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  if (typeof record.documentId === 'string' && record.documentId.length > 0) {
    return record.documentId;
  }

  if (Array.isArray(record.connect) && record.connect.length > 0) {
    return levelRelationToDocumentId(record.connect[0]);
  }

  if (record.data != null) {
    return levelRelationToDocumentId(record.data);
  }

  return null;
}

export function levelRelationToNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  if (typeof record.id === 'number' && Number.isFinite(record.id)) {
    return record.id;
  }

  if (typeof record.id === 'string' && /^\d+$/.test(record.id)) {
    return Number(record.id);
  }

  if (Array.isArray(record.connect) && record.connect.length > 0) {
    return levelRelationToNumericId(record.connect[0]);
  }

  if (record.data != null) {
    return levelRelationToNumericId(record.data);
  }

  return null;
}
