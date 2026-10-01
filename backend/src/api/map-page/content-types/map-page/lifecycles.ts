import { syncMaskotTransformPreviews } from '../../../../utils/syncMaskotTransformPreviews';

type LifecycleEvent = {
  params?: {
    data?: Record<string, unknown>;
  };
  result?: Record<string, unknown> | null;
};

export default {
  async beforeCreate(event: LifecycleEvent) {
    await syncMaskotTransformPreviews(strapi, event.params?.data);
  },

  async beforeUpdate(event: LifecycleEvent) {
    await syncMaskotTransformPreviews(strapi, event.params?.data);
  },

  async afterFindOne(event: LifecycleEvent) {
    await syncMaskotTransformPreviews(strapi, event.result);
  },
};
