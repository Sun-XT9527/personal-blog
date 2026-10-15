export const categories = ['日常记录', '研究札记', '视频文案'] as const;
export type Category = typeof categories[number];

export const categoryDescriptions: Record<Category, string> = {
  日常记录: '训练、习惯与生活里的片段',
  研究札记: '阅读、实验与研究中的发现',
  视频文案: '视频背后的文字与思路',
};

export const legacyCategories = ['学习', '生活', '想法', '教程', '项目'];

export function isCategory(value: unknown): value is Category {
  return categories.some(category => category === value);
}

// Apply the agreed migration to old snapshots and drafts as well as new builds.
export function normalizeCategory(category: string, slug: string, title: string): Category {
  if (isCategory(category)) return category;
  if (slug === 'note-1792034936291' || title.trim() === '为什么你连上校园网，却不能和舍友玩 Minecraft？') {
    return '视频文案';
  }
  return '日常记录';
}
