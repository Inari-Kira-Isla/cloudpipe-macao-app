// CloudNote Learning System Types
// ADR: CloudNote learning records with brain sync tracking

export interface CloudNote {
  id: string
  slug: string
  title: string
  content: string
  category: 'learning' | 'review' | 'insight' | 'research'
  tags: string[]
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
