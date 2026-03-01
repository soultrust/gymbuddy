import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";

type Workout = {
  id: number;
  date: string;
  name: string;
  notes: string;
  exercises: PerformedExercise[];
};

type PerformedExercise = {
  id: number;
  exercise: { id: number; name: string };
  user_preferred_name?: string;
  order: number;
  sets: SetEntry[];
};

type SetEntry = {
  id: number;
  order: number;
  reps: number;
  weight?: string | number;
  notes?: string;
};

type TemplateExercise = {
  exercise: { id: number; name: string };
  user_preferred_name?: string;
  order: number;
  last_sets: SetEntry[];
};

function SetRow({
  set: s,
  editingSetId,
  editingSetReps,
  editingSetWeight,
  setEditingSetId,
  setEditingSetReps,
  setEditingSetWeight,
  onSave,
  onDelete,
}: {
  set: SetEntry;
  editingSetId: number | null;
  editingSetReps: string;
  editingSetWeight: string;
  setEditingSetId: (id: number | null) => void;
  setEditingSetReps: (v: string) => void;
  setEditingSetWeight: (v: string) => void;
  onSave: (set: SetEntry) => void;
  onDelete: (set: SetEntry) => void;
}) {
  const editRef = useRef<HTMLDivElement>(null);

  const handleBlur = () => {
    setTimeout(() => {
      if (editRef.current && !editRef.current.contains(document.activeElement)) {
        onSave(s);
      }
    }, 0);
  };

  if (editingSetId === s.id) {
    return (
      <div className="flex items-center gap-4 text-sm text-stone-700">
        <span className="w-8">Set {s.order}</span>
        <div ref={editRef} className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={editingSetReps}
            onChange={(e) => setEditingSetReps(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(s);
              if (e.key === "Escape") setEditingSetId(null);
            }}
            autoFocus
            className="w-16 px-1.5 py-0.5 rounded border border-stone-300 text-sm"
          />
          <span>reps</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={editingSetWeight}
            onChange={(e) => setEditingSetWeight(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(s);
              if (e.key === "Escape") setEditingSetId(null);
            }}
            placeholder="Weight"
            className="w-16 px-1.5 py-0.5 rounded border border-stone-300 text-sm"
          />
          <span>lbs</span>
          <button
            type="button"
            onClick={() => onDelete(s)}
            className="text-red-500 hover:text-red-600 text-xs"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm text-stone-700">
      <span className="w-8">Set {s.order}</span>
      <div
        onClick={() => {
          setEditingSetId(s.id);
          setEditingSetReps(String(s.reps));
          setEditingSetWeight(s.weight != null && s.weight !== "" ? String(s.weight) : "");
        }}
        className="flex items-center gap-2 cursor-pointer hover:text-amber-600 transition"
        title="Click to edit"
      >
        <span>{s.reps} reps</span>
        {s.weight != null && <span>{s.weight} lbs</span>}
      </div>
    </div>
  );
}

export default function WorkoutDetail({
  workoutId,
  onBack,
}: {
  workoutId: number;
  onBack: () => void;
}) {
  const { token } = useAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [previousExercises, setPreviousExercises] = useState<TemplateExercise[]>([]);
  const [userExercises, setUserExercises] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);

  const fetchWorkout = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<Workout>(`/workouts/${workoutId}/`, { token });
      setWorkout(data);
    } catch {
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

  const getLastSets = (exerciseId: number) =>
    previousExercises.find((p) => p.exercise.id === exerciseId)?.last_sets ?? [];

  const formatLastSets = (sets: SetEntry[]) => {
    if (sets.length === 0) return null;
    return sets
      .map((s) => {
        const w = s.weight ? ` @ ${s.weight}lbs` : "";
        return `${s.reps} reps${w}`;
      })
      .join(", ");
  };

  const [addingSetFor, setAddingSetFor] = useState<number | null>(null);
  const [newSetReps, setNewSetReps] = useState("10");
  const [newSetWeight, setNewSetWeight] = useState("");
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState("");
  const [editingSetId, setEditingSetId] = useState<number | null>(null);
  const [editingSetReps, setEditingSetReps] = useState("");
  const [editingSetWeight, setEditingSetWeight] = useState("");

  const handleAddSet = async (
    e: React.FormEvent,
    performedExerciseId: number,
    currentSets: SetEntry[]
  ) => {
    e.preventDefault();
    if (!token || !workout) return;
    const nextOrder = currentSets.length > 0 ? Math.max(...currentSets.map((s) => s.order)) + 1 : 1;
    const reps = parseInt(newSetReps, 10);
    if (isNaN(reps) || reps < 0) return;
    try {
      await apiRequest(`/performed-exercises/${performedExerciseId}/sets/`, {
        method: "POST",
        token,
        body: {
          order: nextOrder,
          reps,
          weight: newSetWeight ? parseFloat(newSetWeight) : null,
          notes: "",
        },
      });
      setAddingSetFor(null);
      setNewSetReps("10");
      setNewSetWeight("");
      await fetchWorkout();
    } catch {
      // ignore
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
        body: {
          reps,
          weight: editingSetWeight ? parseFloat(editingSetWeight) : null,
        },
      });
      setEditingSetId(null);
      await fetchWorkout();
    } catch {
      // ignore
    }
  };

  const handleDeleteSet = async (set: SetEntry) => {
    if (!token) return;
    try {
      await apiRequest(`/set-entries/${set.id}/`, {
        method: "DELETE",
        token,
      });
      setEditingSetId(null);
      await fetchWorkout();
    } catch {
      // ignore
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
    } catch {
      // ignore
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newExerciseName.trim()) return;
    setAddingExercise(true);
    try {
      const exercises = workout?.exercises ?? [];
      const nextOrder = exercises.length > 0 ? Math.max(...exercises.map((e) => e.order)) + 1 : 1;
      await apiRequest(`/workouts/${workoutId}/exercises/`, {
        method: "POST",
        token,
        body: {
          exercise_name: newExerciseName.trim(),
          order: nextOrder,
          user_preferred_name: "",
        },
      });
      setNewExerciseName("");
      await fetchWorkout();
    } catch {
      // ignore
    } finally {
      setAddingExercise(false);
    }
  };

  const handleAddPastExercise = async (exerciseId: number) => {
    if (!token || !workout) return;
    setAddingExercise(true);
    try {
      const exercises = workout.exercises ?? [];
      const nextOrder = exercises.length > 0 ? Math.max(...exercises.map((e) => e.order)) + 1 : 1;

      let userPreferredName = "";
      let lastSets: SetEntry[] = [];
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
          body: {
            exercise: exerciseId,
            order: nextOrder,
            user_preferred_name: userPreferredName,
          },
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
    } catch {
      // ignore
    } finally {
      setAddingExercise(false);
    }
  };

  /** MM/DD (e.g. 03/17) - matches mobile */
  const formatDate = (d: string) => {
    const date = new Date(d);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${mm}/${dd}`;
  };

  if (loading || !workout) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-stone-200 bg-white">
        <button
          onClick={onBack}
          className="text-amber-600 hover:text-amber-700 font-medium text-sm"
        >
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-stone-900">
            {workout.name || formatDate(workout.date)}
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-stone-50">
        {workout.exercises.length === 0 ? (
          <p className="text-stone-500 text-center py-8">No exercises yet. Add one below.</p>
        ) : (
          <div className="space-y-6">
            {workout.exercises.map((pe) => {
              const lastSets = getLastSets(pe.exercise.id);
              const lastText = formatLastSets(lastSets);
              return (
                <section
                  key={pe.id}
                  className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    {editingExerciseId === pe.id ? (
                      <input
                        type="text"
                        value={editingExerciseName}
                        onChange={(e) => setEditingExerciseName(e.target.value)}
                        onBlur={() => handleSaveExerciseName(pe)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveExerciseName(pe);
                          if (e.key === "Escape") {
                            setEditingExerciseId(null);
                            setEditingExerciseName("");
                          }
                        }}
                        autoFocus
                        className="font-semibold text-stone-900 px-2 py-0.5 rounded border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none flex-1 max-w-[200px]"
                        placeholder={pe.exercise.name}
                      />
                    ) : (
                      <h2
                        onClick={() => {
                          setEditingExerciseId(pe.id);
                          setEditingExerciseName(pe.user_preferred_name || pe.exercise.name || "");
                        }}
                        className="font-semibold text-stone-900 cursor-pointer hover:text-amber-600 transition"
                        title="Click to edit name"
                      >
                        {pe.user_preferred_name || pe.exercise.name}
                      </h2>
                    )}
                    {lastText && <span className="text-sm text-stone-500">Last: {lastText}</span>}
                  </div>
                  <div className="space-y-2">
                    {pe.sets.map((s) => (
                      <SetRow
                        key={s.id}
                        set={s}
                        editingSetId={editingSetId}
                        editingSetReps={editingSetReps}
                        editingSetWeight={editingSetWeight}
                        setEditingSetId={setEditingSetId}
                        setEditingSetReps={setEditingSetReps}
                        setEditingSetWeight={setEditingSetWeight}
                        onSave={handleSaveSet}
                        onDelete={handleDeleteSet}
                      />
                    ))}
                    {addingSetFor === pe.id ? (
                      <form
                        onSubmit={(e) => handleAddSet(e, pe.id, pe.sets)}
                        className="flex gap-2 items-center mt-2"
                      >
                        <input
                          type="number"
                          min="1"
                          value={newSetReps}
                          onChange={(e) => setNewSetReps(e.target.value)}
                          placeholder="Reps"
                          className="w-20 px-2 py-1 text-sm rounded border border-stone-300"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={newSetWeight}
                          onChange={(e) => setNewSetWeight(e.target.value)}
                          placeholder="Weight (lbs)"
                          className="w-24 px-2 py-1 text-sm rounded border border-stone-300"
                        />
                        <button
                          type="submit"
                          className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingSetFor(null)}
                          className="text-sm text-stone-500"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingSetFor(pe.id);
                          const first = pe.sets[0];
                          if (first) {
                            setNewSetReps(String(first.reps));
                            const w = first.weight;
                            setNewSetWeight(w != null && w !== "" ? String(w) : "");
                          }
                        }}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        + Add set
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {userExercises.length > 0 && (
          <div className="mt-8">
            <label
              htmlFor="add-past-exercise"
              className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2"
            >
              Add past exercise
            </label>
            <select
              id="add-past-exercise"
              className="w-full max-w-xs px-4 py-2 rounded-lg border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
              value=""
              onChange={(e) => {
                const id = parseInt(e.target.value, 10);
                if (!isNaN(id)) handleAddPastExercise(id);
                e.target.value = "";
              }}
              disabled={addingExercise}
            >
              <option value="">Select exercise…</option>
              {userExercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <form onSubmit={handleAddExercise} className="mt-6 flex gap-2">
          <input
            type="text"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            placeholder="Add exercise (e.g. Bench Press)"
            className="flex-1 px-4 py-2 rounded-lg border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          />
          <button
            type="submit"
            disabled={addingExercise || !newExerciseName.trim()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </main>
    </div>
  );
}
