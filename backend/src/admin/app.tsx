import type { StrapiApp } from '@strapi/strapi/admin';
import { Eye, Link } from '@strapi/icons';

const puzzleUniqueIdRefTranslations = {
  'puzzle-unique-id-ref.label': 'Kombi-Kind (uniqueId)',
  'puzzle-unique-id-ref.description':
    'uniqueId des zugehörigen Kombi-Puzzle-Items im gleichen Level (alle anderen uniqueIds zur Auswahl).',
  'puzzle-unique-id-ref.placeholder.outside-level':
    'Nur innerhalb der Puzzle-Items eines Levels verfügbar',
  'puzzle-unique-id-ref.placeholder.no-siblings':
    'Keine anderen uniqueIds in diesem Level',
  'puzzle-unique-id-ref.placeholder.select': 'Puzzle auswählen…',
  'puzzle-unique-id-ref.clear': 'Auswahl löschen',
  'puzzle-unique-id-ref.option.none': '— Keine Verknüpfung —',
};

const blocksPreviewTranslations = {
  'blocks-preview.label': 'Vorschau',
  'blocks-preview.description':
    'Automatische Kurzvorschau aus dem Content (nur für die zusammengeklappte Liste).',
};

const levelNamePreviewTranslations = {
  'level-name-preview.label': 'Vorschau',
  'level-name-preview.description':
    'Automatischer Levelname aus der Relation (nur für die zusammengeklappte Liste).',
};

export default {
  config: {
    locales: ['de'],
    translations: {
      de: {
        ...puzzleUniqueIdRefTranslations,
        ...blocksPreviewTranslations,
        ...levelNamePreviewTranslations,
      },
    },
  },
  register(app: StrapiApp) {
    app.customFields.register({
      name: 'puzzle-unique-id-ref',
      type: 'string',
      icon: Link,
      intlLabel: {
        id: 'puzzle-unique-id-ref.label',
        defaultMessage: 'Kombi-Kind (uniqueId)',
      },
      intlDescription: {
        id: 'puzzle-unique-id-ref.description',
        defaultMessage:
          'Verweist auf ein anderes Puzzle-Item im gleichen Level (Auswahl aller uniqueIds außer der eigenen).',
      },
      components: {
        Input: async () =>
          import('./components/PuzzleUniqueIdRefInput').then((module) => ({
            default: module.PuzzleUniqueIdRefInput,
          })),
      },
    });

    app.customFields.register({
      name: 'blocks-preview',
      type: 'string',
      icon: Eye,
      intlLabel: {
        id: 'blocks-preview.label',
        defaultMessage: 'Vorschau',
      },
      intlDescription: {
        id: 'blocks-preview.description',
        defaultMessage:
          'Automatische Kurzvorschau aus dem Content (nur für die zusammengeklappte Liste).',
      },
      components: {
        Input: async () =>
          import('./components/BlocksPreviewInput').then((module) => ({
            default: module.BlocksPreviewInput,
          })),
      },
    });

    app.customFields.register({
      name: 'level-name-preview',
      type: 'string',
      icon: Eye,
      intlLabel: {
        id: 'level-name-preview.label',
        defaultMessage: 'Vorschau',
      },
      intlDescription: {
        id: 'level-name-preview.description',
        defaultMessage:
          'Automatischer Levelname aus der Relation (nur für die zusammengeklappte Liste).',
      },
      components: {
        Input: async () =>
          import('./components/LevelNamePreviewInput').then((module) => ({
            default: module.LevelNamePreviewInput,
          })),
      },
    });
  },
};
