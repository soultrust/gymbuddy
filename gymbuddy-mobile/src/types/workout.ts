export type Exercise = {
  id: number
  name: string
  description?: string
}

export type SetEntry = {
  id: number
  order: number
  reps: number
  weight?: string | number
  notes?: string
}

export type PerformedExercise = {
  id: number
  exercise: Exercise
  user_preferred_name?: string
  order: number
  is_bodyweight?: boolean
  sets: SetEntry[]
  note_for_next_time?: string
}

export type Workout = {
  id: number
  date: string
  date_display?: string
  name: string
  notes: string
  exercises: PerformedExercise[]
}

export type TemplateSetEntry = {
  order: number
  reps: number
  weight?: string | number | null
  notes?: string
}

export type TemplateExercise = {
  exercise: Exercise
  user_preferred_name?: string
  order: number
  last_sets: TemplateSetEntry[]
}

export type TemplateSource = 'previous' | 'another' | 'none'
