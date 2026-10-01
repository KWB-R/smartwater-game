import * as React from 'react';
import { useForm } from '@strapi/strapi/admin';

import { getValueByPath } from '../utils/blocksToPreview';
import { relationToPreviewLabel } from '../utils/relationToPreview';

type CustomFieldInputProps = {
  attribute: { type: string };
  name: string;
  onChange: (event: {
    target: { name: string; type: string; value: string };
  }) => void;
  value?: string | null;
};

function isExplicitlyClearedRelation(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  if (typeof value !== 'object') {
    return false;
  }

  const record = value as {
    connect?: unknown[];
    disconnect?: unknown[];
  };

  const connectEmpty =
    !Array.isArray(record.connect) || record.connect.length === 0;
  const hasDisconnect =
    Array.isArray(record.disconnect) && record.disconnect.length > 0;

  // Leere connect-/disconnect-Listen bedeuten bei Strapi eine unveränderte Beziehung.
  // Die serverseitige Vorschau erst löschen, wenn die Beziehung ausdrücklich entfernt wurde.

  return connectEmpty && hasDisconnect;
}

/**
 * Unsichtbares Hilfsfeld im Admin-Panel. Übernimmt den Namen aus der benachbarten
 * level-Beziehung, damit Strapi ihn als Überschrift im Akkordeon verwenden kann.
 */
const LevelNamePreviewInput = React.forwardRef<HTMLDivElement, CustomFieldInputProps>(
  (props, ref) => {
    const { attribute, name, onChange, value } = props;
    const rootRef = React.useRef<HTMLDivElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const levelPath = React.useMemo(
      () => name.replace(/\.preview$/, '.level'),
      [name],
    );

    const level = useForm(
      'LevelNamePreviewInput',
      (state) => getValueByPath(state.values, levelPath),
      false,
    );

    const fieldType = attribute?.type ?? 'string';
    const currentValue = value ?? '';

    React.useEffect(() => {
      const fromRelation = relationToPreviewLabel(level);

      let next = currentValue;
      if (fromRelation) {
        next = fromRelation;
      } else if (isExplicitlyClearedRelation(level)) {
        next = '';
      }

      if (next === currentValue) {
        return;
      }

      onChange({
        target: {
          name,
          type: fieldType,
          value: next,
        },
      });
    }, [level, currentValue, fieldType, name, onChange]);

    // Feld samt Beschriftung ausblenden; die Komponente bleibt für die Synchronisierung eingebunden.
    React.useLayoutEffect(() => {
      const el = rootRef.current;
      if (!el) {
        return;
      }

      const fieldRoot =
        el.closest('[data-strapi-field]') ??
        el.closest('[class*="Field"]') ??
        el.parentElement;

      if (!(fieldRoot instanceof HTMLElement)) {
        return;
      }

      const previousDisplay = fieldRoot.style.display;
      fieldRoot.style.display = 'none';

      return () => {
        fieldRoot.style.display = previousDisplay;
      };
    }, []);

    return (
      <div
        ref={setRefs}
        aria-hidden
        data-level-name-preview={name}
        style={{ display: 'none' }}
      />
    );
  },
);

LevelNamePreviewInput.displayName = 'LevelNamePreviewInput';

export { LevelNamePreviewInput };
