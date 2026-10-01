/**
 * Ermittelt die Anzeigebezeichnung einer Beziehung im Content Manager.
 * Unterstützt Objekte, verschachtelte data-Werte, connect-/disconnect-Listen und Arrays.
 */
export function relationToPreviewLabel(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? relationToPreviewLabel(value[0]) : '';
  }

  if (typeof value !== 'object') {
    return '';
  }

  const record = value as Record<string, unknown>;

  if (typeof record.label === 'string' && record.label.length > 0) {
    return record.label;
  }

  if (typeof record.name === 'string' && record.name.length > 0) {
    return record.name;
  }

  // Beziehungen werden im Strapi-5-Formular als connect-/disconnect-Listen gespeichert.
  if (Array.isArray(record.connect) && record.connect.length > 0) {
    return relationToPreviewLabel(record.connect[0]);
  }

  if (record.data != null) {
    return relationToPreviewLabel(record.data);
  }

  if (record.attributes != null && typeof record.attributes === 'object') {
    const attrs = record.attributes as Record<string, unknown>;
    if (typeof attrs.name === 'string' && attrs.name.length > 0) {
      return attrs.name;
    }
  }

  return '';
}
