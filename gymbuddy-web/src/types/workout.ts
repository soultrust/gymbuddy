export type Exercise = {
  id: number;
  name: string;
  description?: string;
};

export type SetEntry = {
  id: number;
  order: number;
  reps: number;
  weight?: string | number;
  notes?: string;
};

export type PerformedExercise = {
  id: number;
  exercise: Exercise;
  user_preferred_name?: string;
  order: number;
  sets: SetEntry[];
};

export type Workout = {
  id: number;
  date: string;
  name: string;
  notes: string;
  exercises: PerformedExercise[];
};

export type TemplateExercise = {
  exercise: Exercise;
  user_preferred_name?: string;
  order: number;
  last_sets: SetEntry[];
};
