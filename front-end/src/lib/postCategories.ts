export type PostCategory = 'notice' | 'free' | 'question' | 'suggestion'

export const POST_CATEGORIES: PostCategory[] = ['notice', 'free', 'question', 'suggestion']

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  notice: '공지',
  free: '자유',
  question: '질문',
  suggestion: '건의',
}
