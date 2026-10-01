import { blocksToPreview } from '../../../../utils/blocksToPreview';

type LifecycleEvent = {
  params?: {
    data?: Record<string, unknown>;
  };
};

function syncAnswerPreviews(data: Record<string, unknown> | undefined) {
  const quiz = data?.quiz;
  if (quiz == null || typeof quiz !== 'object') {
    return;
  }

  const answers = (quiz as { answers?: unknown }).answers;
  if (!Array.isArray(answers)) {
    return;
  }

  for (const answer of answers) {
    if (answer == null || typeof answer !== 'object') {
      continue;
    }

    const record = answer as { content?: unknown; preview?: string };
    if (record.content == null) {
      continue;
    }

    record.preview = blocksToPreview(record.content);
  }
}

export default {
  beforeCreate(event: LifecycleEvent) {
    syncAnswerPreviews(event.params?.data);
  },
  beforeUpdate(event: LifecycleEvent) {
    syncAnswerPreviews(event.params?.data);
  },
};
