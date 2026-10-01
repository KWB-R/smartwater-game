import type { Core } from '@strapi/strapi';

import { ensureAnalyticsPermissions } from './utils/ensureAnalyticsPermissions';
import { syncMaskotTransformPreviews } from './utils/syncMaskotTransformPreviews';

const PUZZLE_UNIQUE_ID_REF = 'puzzle-unique-id-ref';
const BLOCKS_PREVIEW = 'blocks-preview';
const LEVEL_NAME_PREVIEW = 'level-name-preview';
const ANSWER_COMPONENT_UID = 'object.answer';
const LEVEL_MASKOT_OFFSET_UID = 'component.level-maskot-offset';
const MAP_PAGE_UID = 'api::map-page.map-page';

async function ensureComponentPreviewMainField(
  strapi: Core.Strapi,
  uid: string,
) {
  const components = strapi.plugin('content-manager').service('components');
  const component = components.findComponent(uid);
  if (!component?.attributes?.preview) {
    return;
  }

  const configuration = await components.findConfiguration(component);
  if (configuration?.settings?.mainField === 'preview') {
    return;
  }

  await components.updateConfiguration(component, {
    ...configuration,
    settings: {
      ...configuration.settings,
      mainField: 'preview',
    },
  });
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.customFields.register({
      name: PUZZLE_UNIQUE_ID_REF,
      type: 'string',
      inputSize: {
        default: 6,
        isResizable: true,
      },
    });

    strapi.customFields.register({
      name: BLOCKS_PREVIEW,
      type: 'string',
      inputSize: {
        default: 4,
        isResizable: false,
      },
    });

    strapi.customFields.register({
      name: LEVEL_NAME_PREVIEW,
      type: 'string',
      inputSize: {
        default: 4,
        isResizable: false,
      },
    });

    strapi.documents.use(async (context, next) => {
      const result = await next();

      if (
        context.uid === MAP_PAGE_UID &&
        (context.action === 'findOne' || context.action === 'findFirst') &&
        result != null &&
        typeof result === 'object'
      ) {
        await syncMaskotTransformPreviews(
          strapi,
          result as Record<string, unknown>,
        );
      }

      return result;
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureComponentPreviewMainField(strapi, ANSWER_COMPONENT_UID);
    await ensureComponentPreviewMainField(strapi, LEVEL_MASKOT_OFFSET_UID);
    await ensureAnalyticsPermissions(strapi);
  },
};
