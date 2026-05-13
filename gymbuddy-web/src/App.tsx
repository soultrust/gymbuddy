import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/LoginForm";
import WorkoutsList from "@/components/WorkoutsList";
import WorkoutDetail from "@/components/WorkoutDetail";

export default function App() {
  const { token, isLoading, authError, clearAuthError } = useAuth();
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const handleBack = () => {
    setSelectedWorkoutId(null);
    setListRefreshKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (token) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        {/* Keep WorkoutsList mounted so it holds data; hide it while a detail is open */}
        <div className={selectedWorkoutId ? "hidden" : "flex flex-col flex-1"}>
          <WorkoutsList
            onSelectWorkout={setSelectedWorkoutId}
            refreshKey={listRefreshKey}
          />
        </div>
        {selectedWorkoutId && (
          <WorkoutDetail workoutId={selectedWorkoutId} onBack={handleBack} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-4">
      {authError && (
        <div
          className="mb-4 p-4 max-w-sm w-full bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between gap-4"
          role="alert"
        >
          <span>{authError}</span>
          <button
            type="button"
            onClick={clearAuthError}
            className="text-red-500 hover:text-red-700 shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <LoginForm />
    </div>
  );
}
