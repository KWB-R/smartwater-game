import * as React from 'react';
import { useForm } from '@strapi/strapi/admin';

import { blocksToPreview, getValueByPath } from '../utils/blocksToPreview';

type CustomFieldInputProps = {
  attribute: { type: string };
  name: string;
  onChange: (event: {
    target: { name: string; type: string; value: string };
  }) => void;
  value?: string | null;
};

/**
 * Unsichtbares Hilfsfeld im Admin-Panel. Übernimmt eine Textvorschau aus dem benachbarten
 * content-Feld, damit Strapi sie als Überschrift im Akkordeon verwenden kann.
 */
const BlocksPreviewInput = React.forwardRef<HTMLDivElement, CustomFieldInputProps>(
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

    const contentPath = React.useMemo(
      () => name.replace(/\.preview$/, '.content'),
      [name],
    );

    const content = useForm(
      'BlocksPreviewInput',
      (state) => getValueByPath(state.values, contentPath),
      false,
    );

    const fieldType = attribute?.type ?? 'string';
    const currentValue = value ?? '';

    React.useEffect(() => {
      const next = blocksToPreview(content);
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
    }, [content, currentValue, fieldType, name, onChange]);

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
        data-blocks-preview={name}
        style={{ display: 'none' }}
      />
    );
  },
);

BlocksPreviewInput.displayName = 'BlocksPreviewInput';

export { BlocksPreviewInput };
