import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import type { Workout, PerformedExercise } from "@/types/workout";
import { formatDate } from "@/utils/format";
import CreateWorkoutModal from "@/components/CreateWorkoutModal";


export default function WorkoutsList({
  onSelectWorkout,
  refreshKey = 0,
}: {
  onSelectWorkout?: (id: number) => void;
  refreshKey?: number;
}) {
  const { token, logout } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<Workout[] | { results: Workout[] }>("/workouts/", { token });
      setListError(null);
      setWorkouts(Array.isArray(data) ? data : data.results ?? []);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        await logout();
      } else {
        setListError(err instanceof Error ? err.message : "Could not load workouts.");
      }
    }
  }, [token, logout]);

  useEffect(() => {
    fetchWorkouts().finally(() => setLoading(false));
  }, [fetchWorkouts]);

  // Silent background refresh when navigating back from a workout detail.
  // refreshKey is incremented by App each time the user returns to the list.
  useEffect(() => {
    if (refreshKey > 0) {
      fetchWorkouts();
    }
  }, [refreshKey, fetchWorkouts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorkouts();
    setRefreshing(false);
  };

  const handleWorkoutCreated = async (workoutId: number) => {
    setShowCreateForm(false);
    await fetchWorkouts();
    if (onSelectWorkout) onSelectWorkout(workoutId);
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

      <CreateWorkoutModal
        visible={showCreateForm}
        token={token}
        onClose={() => setShowCreateForm(false)}
        onCreated={handleWorkoutCreated}
      />

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
        {listError ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-red-600 text-sm text-center">{listError}</p>
            <button
              onClick={() => { setListError(null); fetchWorkouts(); }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition"
            >
              Try again
            </button>
          </div>
        ) : workouts.length === 0 ? (
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
