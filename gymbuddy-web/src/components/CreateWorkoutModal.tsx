import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Workout, TemplateExercise, TemplateSetEntry } from "@/types/workout";
import { formatDate } from "@/utils/format";

const todayISO = () => new Date().toISOString().slice(0, 10);

interface CreateWorkoutModalProps {
  visible: boolean;
  token: string | null;
  onClose: () => void;
  onCreated: (workoutId: number) => void;
}

export default function CreateWorkoutModal({
  visible,
  token,
  onClose,
  onCreated,
}: CreateWorkoutModalProps) {
  const [template, setTemplate] = useState<TemplateExercise[]>([]);
  const [createDate, setCreateDate] = useState(todayISO);
  const [createName, setCreateName] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [useTemplate, setUseTemplate] = useState(true);

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
    if (visible) {
      fetchTemplate();
      setCreateName(createDate);
    }
  }, [visible, fetchTemplate, createDate]);

  const handleClose = () => {
    if (createSubmitting) return;
    setUseTemplate(true);
    onClose();
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
      if (useTemplate && template.length > 0) {
        for (const t of template) {
          const performed = await apiRequest<{ id: number }>(
            `/workouts/${workout.id}/exercises/`,
            {
              method: "POST",
              token,
              body: {
                exercise: t.exercise.id,
                user_preferred_name: t.user_preferred_name || "",
                order: t.order,
              },
            }
          );
          for (const s of (t.last_sets ?? []) as TemplateSetEntry[]) {
            await apiRequest(`/performed-exercises/${performed.id}/sets/`, {
              method: "POST",
              token,
              body: {
                order: s.order,
                reps: s.reps,
                weight: s.weight != null && s.weight !== "" ? Number(s.weight) : null,
                notes: s.notes ?? "",
              },
            });
          }
        }
      }
      setCreateDate(todayISO());
      setCreateName("");
      setCreateNotes("");
      setUseTemplate(true);
      onCreated(workout.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create workout");
    } finally {
      setCreateSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
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
          <div className="mb-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useTemplate}
                onChange={(e) => setUseTemplate(e.target.checked)}
                className="mt-0.5 accent-amber-500 w-4 h-4 shrink-0"
              />
              <span className="text-sm text-stone-700">
                <span className="font-medium">Use last workout as template</span>
                <span className="block text-stone-400 font-normal mt-0.5">
                  {template.map((t) => t.exercise.name).join(", ")}
                </span>
              </span>
            </label>
          </div>
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
              onClick={handleClose}
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
  );
}
