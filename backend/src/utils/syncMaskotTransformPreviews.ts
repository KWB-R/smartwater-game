import type { Core } from '@strapi/strapi';

import {
  levelRelationToDocumentId,
  levelRelationToName,
  levelRelationToNumericId,
} from './levelRelationPreview';

type MaskotTransform = {
  level?: unknown;
  preview?: string | null;
};

async function resolveLevelName(
  strapi: Core.Strapi,
  level: unknown,
): Promise<string> {
  const fromPayload = levelRelationToName(level);
  if (fromPayload) {
    return fromPayload;
  }

  const documentId = levelRelationToDocumentId(level);
  if (documentId) {
    const entry = await strapi.documents('api::level.level').findOne({
      documentId,
      fields: ['name'],
    });
    return typeof entry?.name === 'string' ? entry.name : '';
  }

  const id = levelRelationToNumericId(level);
  if (id != null) {
    const rows = await strapi.db.query('api::level.level').findMany({
      where: { id },
      select: ['name'],
      limit: 1,
    });
    const name = rows?.[0]?.name;
    return typeof name === 'string' ? name : '';
  }

  return '';
}

export async function syncMaskotTransformPreviews(
  strapi: Core.Strapi,
  data: Record<string, unknown> | null | undefined,
) {
  if (data == null) {
    return;
  }

  const transforms = data.maskotTransforms;
  if (!Array.isArray(transforms)) {
    return;
  }

  await Promise.all(
    transforms.map(async (item) => {
      if (item == null || typeof item !== 'object') {
        return;
      }

      const record = item as MaskotTransform;
      record.preview = await resolveLevelName(strapi, record.level);
    }),
  );
}
