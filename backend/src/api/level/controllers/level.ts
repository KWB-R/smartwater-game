import { factories } from '@strapi/strapi';

import { transformLevelPuzzleItems } from '../../../utils/punkte';

function transformLevelResponseData(data: unknown) {
  if (Array.isArray(data)) {
    return data.map((entry) =>
      entry && typeof entry === 'object'
        ? transformLevelPuzzleItems(entry as Record<string, unknown>)
        : entry,
    );
  }

  if (data && typeof data === 'object') {
    return transformLevelPuzzleItems(data as Record<string, unknown>);
  }

  return data;
}

export default factories.createCoreController('api::level.level', () => ({
  async find(ctx) {
    const response = await super.find(ctx);

    if (response?.data) {
      response.data = transformLevelResponseData(response.data);
    }

    return response;
  },

  async findOne(ctx) {
    const response = await super.findOne(ctx);

    if (response?.data) {
      response.data = transformLevelResponseData(response.data);
    }

    return response;
  },
}));
