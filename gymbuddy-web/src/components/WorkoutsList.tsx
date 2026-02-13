import { useCallback, useEffect, useState } from "react";
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
  id?: number;
  exercise: { id: number; name: string };
  user_preferred_name?: string;
  order: number;
  sets: SetEntry[];
};

type SetEntry = {
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

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function WorkoutsList({
  onSelectWorkout,
}: {
  onSelectWorkout?: (id: number) => void;
}) {
  const { token, logout } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [template, setTemplate] = useState<TemplateExercise[]>([]);
  const [createDate, setCreateDate] = useState(todayISO);
  const [createName, setCreateName] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<Workout[] | { results: Workout[] }>("/workouts/", { token });
      setWorkouts(Array.isArray(data) ? data : data.results ?? []);
    } catch {
      setWorkouts([]);
    }
  }, [token]);

  const fetchTemplate = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<TemplateExercise[]>("/workouts/template/", { token });
      setTemplate(Array.isArray(data) ? data : []);
    } catch {
      setTemplate([]);
    }
  }, [token]);

  useEffect(() => {
    fetchWorkouts().finally(() => setLoading(false));
  }, [fetchWorkouts]);

  /** MM/DD (e.g. 03/17) for list - matches mobile */
  const formatDate = (d: string) => {
    const date = new Date(d);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${mm}/${dd}`;
  };

  useEffect(() => {
    if (showCreateForm) {
      fetchTemplate();
      setCreateName(createDate);
    }
  }, [showCreateForm, fetchTemplate, createDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorkouts();
    setRefreshing(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      const workout = await apiRequest<Workout>("/workouts/", {
        method: "POST",
        token,
        body: {
          date: createDate,
          name: createName.trim() || formatDate(createDate),
          notes: createNotes.trim() || "",
        },
      });
      for (const t of template) {
        await apiRequest(`/workouts/${workout.id}/exercises/`, {
          method: "POST",
          token,
          body: {
            exercise: t.exercise.id,
            user_preferred_name: t.user_preferred_name || "",
            order: t.order,
          },
        });
      }
      setShowCreateForm(false);
      setCreateDate(todayISO());
      setCreateName("");
      setCreateNotes("");
      await fetchWorkouts();
      if (workout.id && onSelectWorkout) onSelectWorkout(workout.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create workout");
    } finally {
      setCreateSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
        <h1 className="text-xl font-bold text-stone-900">Workouts</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm rounded-lg transition"
          >
            New Workout
          </button>
          <button
            onClick={logout}
            className="text-amber-600 hover:text-amber-700 font-medium text-sm"
          >
            Log out
          </button>
        </div>
      </header>

      {showCreateForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !createSubmitting && setShowCreateForm(false)}
          role="dialog"
          aria-modal
          aria-labelledby="create-workout-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="create-workout-title" className="text-xl font-bold text-stone-900 mb-4">
              New Workout
            </h2>
            {template.length > 0 && (
              <p className="text-sm text-stone-600 mb-4">
                Based on last workout: {template.map((t) => t.exercise.name).join(", ")}
              </p>
            )}
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="workout-date"
                  className="block text-sm font-medium text-stone-700 mb-1"
                >
                  Date
                </label>
                <input
                  id="workout-date"
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="workout-name"
                  className="block text-sm font-medium text-stone-700 mb-1"
                >
                  Name <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  id="workout-name"
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Push Day"
                  className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="workout-notes"
                  className="block text-sm font-medium text-stone-700 mb-1"
                >
                  Notes <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="workout-notes"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Any notes..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                />
              </div>
              {createError && <p className="text-red-600 text-sm">{createError}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => !createSubmitting && setShowCreateForm(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {createSubmitting ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto p-6 bg-stone-50">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-sm text-stone-500 hover:text-stone-700 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {workouts.length === 0 ? (
          <p className="text-stone-500 text-center py-12">No workouts yet</p>
        ) : (
          (() => {
            const exerciseMap = new Map<number, string>();
            for (const w of workouts) {
              for (const pe of w.exercises || []) {
                const id = pe.exercise?.id;
                const name = pe.user_preferred_name || pe.exercise?.name;
                if (id && name && !exerciseMap.has(id)) {
                  exerciseMap.set(id, name);
                }
              }
            }
            const orderedIds: number[] = [];
            for (const w of workouts) {
              for (const pe of w.exercises || []) {
                const id = pe.exercise?.id;
                if (id && !orderedIds.includes(id)) orderedIds.push(id);
              }
            }
            const exerciseColumns = orderedIds.map((id) => ({
              id,
              name: exerciseMap.get(id) ?? "",
            }));

            const formatSets = (pe: PerformedExercise) => {
              const sets = pe.sets || [];
              if (sets.length === 0) return "—";
              const chip = "border border-stone-300 rounded-[4px] px-1.5 py-0.5";
              return (
                <span className="inline-flex flex-wrap gap-1.5">
                  {sets.map((s, i) => (
                    <span key={i} className={`${chip} inline-flex gap-1 items-center`}>
                      <span className={chip}>{s.reps}</span>
                      {s.weight != null && s.weight !== "" && (
                        <span className={chip}>{s.weight}</span>
                      )}
                    </span>
                  ))}
                </span>
              );
            };

            const getExerciseForWorkout = (workout: Workout, exerciseId: number) =>
              (workout.exercises || []).find((pe) => pe.exercise?.id === exerciseId);

            return (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50">
                      <th className="text-left px-4 py-3 font-semibold text-stone-700 whitespace-nowrap">
                        Title
                      </th>
                      {exerciseColumns.map((ex) => (
                        <th
                          key={ex.id}
                          className="text-left px-4 py-3 font-semibold text-stone-700 whitespace-nowrap"
                        >
                          {ex.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workouts.map((w) => (
                      <tr
                        key={w.id}
                        onClick={() => onSelectWorkout?.(w.id)}
                        className="border-b border-stone-100 last:border-b-0 cursor-pointer hover:bg-amber-50/50 transition"
                      >
                        <td className="px-4 py-3 font-medium text-stone-900 whitespace-nowrap">
                          {w.name || formatDate(w.date)}
                        </td>
                        {exerciseColumns.map((ex) => {
                          const pe = getExerciseForWorkout(w, ex.id);
                          return (
                            <td
                              key={ex.id}
                              className="px-4 py-3 text-stone-600 text-sm whitespace-nowrap"
                            >
                              {pe ? formatSets(pe) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        )}
      </main>
    </div>
  );
}
