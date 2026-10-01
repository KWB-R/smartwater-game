import * as React from 'react';
import { Field, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useForm } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';

import { formatIntlMessage, intlLikeToString } from '../utils/formatIntl';
import {
  getSiblingPuzzleUniqueIds,
  parsePuzzleItemIndex,
} from '../utils/puzzleUniqueIdOptions';

type CustomFieldInputProps = {
  attribute: { type: string };
  disabled?: boolean;
  error?: unknown;
  hint?: unknown;
  intlLabel?: { id?: string; defaultMessage?: string };
  label?: string;
  name: string;
  onChange: (event: {
    target: { name: string; type: string; value: string | null };
  }) => void;
  required?: boolean;
  value?: string | null;
};

const EMPTY_VALUE = '__none__';

const PuzzleUniqueIdRefInput = React.forwardRef<HTMLDivElement, CustomFieldInputProps>(
  (props, ref) => {
    const {
      attribute,
      disabled,
      error,
      hint,
      intlLabel,
      label: labelProp,
      name,
      onChange,
      required,
      value,
    } = props;
    const intl = useIntl();

    const puzzleItems = useForm(
      'PuzzleUniqueIdRefInput',
      (state) => state.values?.puzzleItems,
      false,
    );

    const currentIndex = React.useMemo(() => parsePuzzleItemIndex(name), [name]);

    const options = React.useMemo(
      () => getSiblingPuzzleUniqueIds(puzzleItems, currentIndex),
      [puzzleItems, currentIndex],
    );

    const label =
      typeof labelProp === 'string' && labelProp.length > 0
        ? labelProp
        : formatIntlMessage(intl, intlLabel, 'puzzle-unique-id-ref.label');
    const hintText = intlLikeToString(intl, hint, 'puzzle-unique-id-ref.hint');
    const errorText = intlLikeToString(intl, error, 'puzzle-unique-id-ref.error');

    const selectValue = value && value.length > 0 ? value : EMPTY_VALUE;

    const fieldType = attribute?.type ?? 'string';

    const handleChange = (next: string | number) => {
      const stringValue = String(next);
      onChange({
        target: {
          name,
          type: fieldType,
          value: stringValue === EMPTY_VALUE ? '' : stringValue,
        },
      });
    };

    const handleClear = () => {
      onChange({
        target: { name, type: fieldType, value: '' },
      });
    };

    const placeholder =
      currentIndex === null
        ? formatIntlMessage(intl, {
            id: 'puzzle-unique-id-ref.placeholder.outside-level',
            defaultMessage: 'Nur innerhalb der Puzzle-Items eines Levels verfügbar',
          }, 'puzzle-unique-id-ref.placeholder.outside-level')
        : options.length === 0
          ? formatIntlMessage(intl, {
              id: 'puzzle-unique-id-ref.placeholder.no-siblings',
              defaultMessage: 'Keine anderen uniqueIds in diesem Level',
            }, 'puzzle-unique-id-ref.placeholder.no-siblings')
          : formatIntlMessage(intl, {
              id: 'puzzle-unique-id-ref.placeholder.select',
              defaultMessage: 'Puzzle auswählen…',
            }, 'puzzle-unique-id-ref.placeholder.select');

    return (
      <Field.Root name={name} id={name} error={errorText} hint={hintText} required={required}>
        <Field.Label>{label}</Field.Label>
        <SingleSelect
          ref={ref}
          name={name}
          disabled={disabled || currentIndex === null}
          value={selectValue}
          placeholder={placeholder}
          onChange={handleChange}
          onClear={required ? undefined : handleClear}
          clearLabel={formatIntlMessage(
            intl,
            {
              id: 'puzzle-unique-id-ref.clear',
              defaultMessage: 'Auswahl löschen',
            },
            'puzzle-unique-id-ref.clear',
          )}
          hasError={Boolean(errorText)}
        >
          {!required && (
            <SingleSelectOption value={EMPTY_VALUE}>
              {formatIntlMessage(
                intl,
                {
                  id: 'puzzle-unique-id-ref.option.none',
                  defaultMessage: '— Keine Verknüpfung —',
                },
                'puzzle-unique-id-ref.option.none',
              )}
            </SingleSelectOption>
          )}
          {options.map((uniqueId) => (
            <SingleSelectOption key={uniqueId} value={uniqueId}>
              {uniqueId}
            </SingleSelectOption>
          ))}
        </SingleSelect>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  },
);

PuzzleUniqueIdRefInput.displayName = 'PuzzleUniqueIdRefInput';

export { PuzzleUniqueIdRefInput };
