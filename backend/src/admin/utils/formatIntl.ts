import type { IntlShape, MessageDescriptor } from 'react-intl';

type IntlLike = Partial<MessageDescriptor> & {
  defaultMessage?: MessageDescriptor['defaultMessage'];
};

const FALLBACK_LABELS: Record<string, string> = {
  'puzzle-unique-id-ref.label': 'Kombi-Kind (uniqueId)',
  'puzzle-unique-id-ref.hint': '',
  'puzzle-unique-id-ref.error': '',
  'puzzle-unique-id-ref.placeholder.outside-level':
    'Nur innerhalb der Puzzle-Items eines Levels verfügbar',
  'puzzle-unique-id-ref.placeholder.no-siblings':
    'Keine anderen uniqueIds in diesem Level',
  'puzzle-unique-id-ref.placeholder.select': 'Puzzle auswählen…',
  'puzzle-unique-id-ref.clear': 'Auswahl löschen',
  'puzzle-unique-id-ref.option.none': '— Keine Verknüpfung —',
};

/**
 * formatjs verlangt eine id. Strapi liefert teils nur defaultMessage oder keine Beschreibung.
 */
export function formatIntlMessage(
  intl: IntlShape,
  descriptor: IntlLike | null | undefined,
  fallbackId: string,
): string {
  const fallbackDefault =
    FALLBACK_LABELS[fallbackId] ?? fallbackId.replace(/^.*\./, '').replace(/-/g, ' ');

  if (descriptor == null || typeof descriptor !== 'object') {
    return intl.formatMessage({
      id: fallbackId,
      defaultMessage: fallbackDefault,
    });
  }

  const defaultMessage =
    typeof descriptor.defaultMessage === 'string'
      ? descriptor.defaultMessage
      : fallbackDefault;

  return intl.formatMessage({
    id: typeof descriptor.id === 'string' && descriptor.id.length > 0 ? descriptor.id : fallbackId,
    defaultMessage,
  });
}

export function intlLikeToString(
  intl: IntlShape,
  value: unknown,
  fallbackId: string,
): string | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    return formatIntlMessage(intl, value as IntlLike, fallbackId);
  }
  return undefined;
}
