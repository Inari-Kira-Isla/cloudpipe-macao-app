// CloudNote Learning System Types
// ADR: CloudNote learning records with brain sync tracking

// Six-step feedback loop steps
export const LOOP_STEPS = [
  'auto_save',      // 自動存
  'search_knowledge', // 先搜現有知識
  'compare',        // 比對
  'audit',          // 成效審計問句
  'recommend',      // 建議
  'bulletin',       // 落告示板
] as const

export type LoopStep = typeof LOOP_STEPS[number]

export interface CloudNote {
  id: string
  slug: string
  title: string
  content: string
  category: 'learning' | 'review' | 'insight' | 'research'
  tags: string[]
  loop_steps_completed: LoopStep[]  // Track which loop steps are completed
  brain_synced_at: string | null  // ISO timestamp when synced to brain
  brain_confidence: number | null  // 0-1 confidence score
  created_at: string
  updated_at: string
}

export interface LearningRecord {
  id: string
  note_id: string
  event_type: 'created' | 'updated' | 'reviewed' | 'synced' | 'archived'
  event_data: Record<string, unknown>
  created_at: string
}

export interface BrainSearchResult {
  note: CloudNote
  relevance_score: number
  matched_terms: string[]
  context_snippet: string
}

export interface TimelineEvent {
  id: string
  date: string
  type: 'created' | 'updated' | 'reviewed' | 'synced' | 'archived'
  note_title: string
  note_slug: string
  description: string
}
