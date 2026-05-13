import { useRef } from "react";
import type { SetEntry } from "@/types/workout";
import { formatDate } from "@/utils/format";
import { useWorkoutDetail } from "@/hooks/useWorkoutDetail";

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
  const {
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
    submitAddSet,
    handleSaveSet,
    handleDeleteSet,
    handleSaveExerciseName,
    handleAddExercise,
    handleAddPastExercise,
  } = useWorkoutDetail(workoutId);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError || !workout) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-stone-500 text-center">{fetchError ?? "Workout not found."}</p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 font-medium"
          >
            ← Back
          </button>
          {fetchError && (
            <button
              onClick={retry}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition"
            >
              Try again
            </button>
          )}
        </div>
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
        {mutationError && (
          <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span>{mutationError}</span>
            <button
              onClick={() => setMutationError(null)}
              className="text-red-400 hover:text-red-600 font-bold text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

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
                      <div
                        className="flex gap-2 items-center mt-2"
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setTimeout(() => submitAddSet(pe.id, pe.sets), 0);
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setAddingSetFor(null)}
                          className="text-stone-400 hover:text-stone-600 p-1 -m-1"
                          aria-label="Cancel"
                        >
                          ×
                        </button>
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
                      </div>
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
          <div className="mt-8 p-4 rounded-xl border border-stone-200 bg-white shadow-sm">
            <label
              htmlFor="add-past-exercise"
              className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2"
            >
              Add past exercise{" "}
              <span className="font-normal normal-case tracking-normal text-stone-400">
                (uses data from last time)
              </span>
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

        <form
          onSubmit={handleAddExercise}
          className="mt-6 p-4 rounded-xl border border-stone-200 bg-white shadow-sm flex flex-col gap-2"
        >
          <label
            htmlFor="add-exercise"
            className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2"
          >
            Add New Exercise
          </label>
          <div className="flex gap-2">
            <input
              id="add-exercise"
              type="text"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              placeholder="e.g. Bench Press"
              className="flex-1 px-4 py-2 rounded-lg border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
            <button
              type="submit"
              disabled={addingExercise || !newExerciseName.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
