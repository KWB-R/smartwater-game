type BlocksNode = {
  text?: string;
  children?: BlocksNode[];
};

const DEFAULT_MAX_WORDS = 8;

function walkBlocks(nodes: BlocksNode[], parts: string[]) {
  for (const node of nodes) {
    if (typeof node.text === 'string' && node.text.length > 0) {
      parts.push(node.text);
    }
    if (Array.isArray(node.children)) {
      walkBlocks(node.children, parts);
    }
  }
}

export function blocksToPlainText(blocks: unknown): string {
  if (!Array.isArray(blocks)) {
    return '';
  }

  const parts: string[] = [];
  walkBlocks(blocks as BlocksNode[], parts);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

export function blocksToPreview(
  blocks: unknown,
  maxWords: number = DEFAULT_MAX_WORDS,
): string {
  const text = blocksToPlainText(blocks);
  if (!text) {
    return '';
  }

  const words = text.split(' ').filter(Boolean);
  if (words.length <= maxWords) {
    return text;
  }

  return `${words.slice(0, maxWords).join(' ')}…`;
}

export function getValueByPath(root: unknown, path: string): unknown {
  if (!path) {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, root);
}
