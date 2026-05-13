import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import type {
  Workout,
  PerformedExercise,
  SetEntry,
  TemplateExercise,
  TemplateSetEntry,
} from "@/types/workout";
import { formatWeight } from "@/utils/format";

export function useWorkoutDetail(workoutId: number) {
  const { token } = useAuth();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [previousExercises, setPreviousExercises] = useState<TemplateExercise[]>([]);
  const [userExercises, setUserExercises] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);
  const [addingSetFor, setAddingSetFor] = useState<number | null>(null);
  const [newSetReps, setNewSetReps] = useState("10");
  const [newSetWeight, setNewSetWeight] = useState("");
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState("");
  const [editingSetId, setEditingSetId] = useState<number | null>(null);
  const [editingSetReps, setEditingSetReps] = useState("");
  const [editingSetWeight, setEditingSetWeight] = useState("");

  const fetchWorkout = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<Workout>(`/workouts/${workoutId}/`, { token });
      setFetchError(null);
      setWorkout(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Could not load workout.");
      setWorkout(null);
    }
  }, [token, workoutId]);

  const fetchPrevious = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<TemplateExercise[]>(
        `/workouts/${workoutId}/previous_exercises/`,
        { token }
      );
      setPreviousExercises(Array.isArray(data) ? data : []);
    } catch {
      setPreviousExercises([]);
    }
  }, [token, workoutId]);

  const fetchUserExercises = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ id: number; name: string }[]>(
        `/workouts/user_exercises/`,
        { token }
      );
      setUserExercises(Array.isArray(data) ? data : []);
    } catch {
      setUserExercises([]);
    }
  }, [token]);

  useEffect(() => {
    Promise.all([fetchWorkout(), fetchPrevious(), fetchUserExercises()]).finally(() =>
      setLoading(false)
    );
  }, [fetchWorkout, fetchPrevious, fetchUserExercises]);

  const retry = () => {
    setFetchError(null);
    setLoading(true);
    Promise.all([fetchWorkout(), fetchPrevious(), fetchUserExercises()]).finally(() =>
      setLoading(false)
    );
  };

  const getLastSets = (exerciseId: number) =>
    previousExercises.find((p) => p.exercise.id === exerciseId)?.last_sets ?? [];

  const formatLastSets = (sets: TemplateSetEntry[]) => {
    if (sets.length === 0) return null;
    return sets
      .map((s) => {
        const w = formatWeight(s.weight ?? undefined);
        return `${s.reps} reps${w ? ` @ ${w}lbs` : ""}`;
      })
      .join(", ");
  };

  const submitAddSet = async (performedExerciseId: number, currentSets: SetEntry[]) => {
    if (!token || !workout) return;
    const nextOrder =
      currentSets.length > 0 ? Math.max(...currentSets.map((s) => s.order)) + 1 : 1;
    const reps = parseInt(newSetReps, 10);
    if (isNaN(reps) || reps < 0) return;
    try {
      await apiRequest(`/performed-exercises/${performedExerciseId}/sets/`, {
        method: "POST",
        token,
        body: { order: nextOrder, reps, weight: newSetWeight ? parseFloat(newSetWeight) : null, notes: "" },
      });
      setAddingSetFor(null);
      setNewSetReps("10");
      setNewSetWeight("");
      await fetchWorkout();
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Could not add set.");
    }
  };

  const handleSaveSet = async (set: SetEntry) => {
    if (!token) return;
    const reps = parseInt(editingSetReps, 10);
    if (isNaN(reps) || reps < 0) return;
    try {
      await apiRequest(`/set-entries/${set.id}/`, {
        method: "PATCH",
        token,
        body: { reps, weight: editingSetWeight ? parseFloat(editingSetWeight) : null },
      });
      setEditingSetId(null);
      await fetchWorkout();
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Could not save set.");
    }
  };

  const handleDeleteSet = async (set: SetEntry) => {
    if (!token) return;
    try {
      await apiRequest(`/set-entries/${set.id}/`, { method: "DELETE", token });
      setEditingSetId(null);
      await fetchWorkout();
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Could not delete set.");
    }
  };

  const handleSaveExerciseName = async (pe: PerformedExercise) => {
    if (!token) return;
    const name = editingExerciseName.trim();
    try {
      await apiRequest(`/performed-exercises/${pe.id}/`, {
        method: "PATCH",
        token,
        body: { user_preferred_name: name || "" },
      });
      setEditingExerciseId(null);
      await fetchWorkout();
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Could not save exercise name.");
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newExerciseName.trim()) return;
    setAddingExercise(true);
    try {
      const exercises = workout?.exercises ?? [];
      const nextOrder =
        exercises.length > 0 ? Math.max(...exercises.map((ex) => ex.order)) + 1 : 1;
      await apiRequest(`/workouts/${workoutId}/exercises/`, {
        method: "POST",
        token,
        body: { exercise_name: newExerciseName.trim(), order: nextOrder, user_preferred_name: "" },
      });
      setNewExerciseName("");
      await fetchWorkout();
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Could not add exercise.");
    } finally {
      setAddingExercise(false);
    }
  };

  const handleAddPastExercise = async (exerciseId: number) => {
    if (!token || !workout) return;
    setAddingExercise(true);
    try {
      const exercises = workout.exercises ?? [];
      const nextOrder =
        exercises.length > 0 ? Math.max(...exercises.map((ex) => ex.order)) + 1 : 1;

      let userPreferredName = "";
      let lastSets: TemplateSetEntry[] = [];
      try {
        const last = await apiRequest<TemplateExercise>(
          `/workouts/last_exercise_performance/?exercise_id=${exerciseId}`,
          { token }
        );
        if (last?.user_preferred_name) userPreferredName = last.user_preferred_name;
        if (Array.isArray(last?.last_sets) && last.last_sets.length > 0) lastSets = last.last_sets;
      } catch {
        // No previous performance; add exercise with no sets
      }

      const created = await apiRequest<PerformedExercise>(
        `/workouts/${workoutId}/exercises/`,
        {
          method: "POST",
          token,
          body: { exercise: exerciseId, order: nextOrder, user_preferred_name: userPreferredName },
        }
      );

      for (let i = 0; i < lastSets.length; i++) {
        const s = lastSets[i];
        const reps = typeof s.reps === "number" ? s.reps : parseInt(String(s.reps), 10);
        if (isNaN(reps) || reps < 0) continue;
        await apiRequest(`/performed-exercises/${created.id}/sets/`, {
          method: "POST",
          token,
          body: {
            order: i + 1,
            reps,
            weight: s.weight != null && s.weight !== "" ? parseFloat(String(s.weight)) : null,
            notes: s.notes ?? "",
          },
        });
      }
      await fetchWorkout();
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Could not add exercise.");
    } finally {
      setAddingExercise(false);
    }
  };

  return {
    workout,
    loading,
    fetchError,
    mutationError,
    setMutationError,
    userExercises,
    newExerciseName,
    setNewExerciseName,
    addingExercise,
    addingSetFor,
    setAddingSetFor,
    newSetReps,
    setNewSetReps,
    newSetWeight,
    setNewSetWeight,
    editingExerciseId,
    setEditingExerciseId,
    editingExerciseName,
    setEditingExerciseName,
    editingSetId,
    setEditingSetId,
    editingSetReps,
    setEditingSetReps,
    editingSetWeight,
    setEditingSetWeight,
    getLastSets,
    formatLastSets,
    retry,
    fetchWorkout,
    submitAddSet,
    handleSaveSet,
    handleDeleteSet,
    handleSaveExerciseName,
    handleAddExercise,
    handleAddPastExercise,
  };
}
