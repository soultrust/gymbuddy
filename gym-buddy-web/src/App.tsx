import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/LoginForm";
import WorkoutsList from "@/components/WorkoutsList";
import WorkoutDetail from "@/components/WorkoutDetail";

export default function App() {
  const { token, isLoading } = useAuth();
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);

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
        {selectedWorkoutId ? (
          <WorkoutDetail workoutId={selectedWorkoutId} onBack={() => setSelectedWorkoutId(null)} />
        ) : (
          <WorkoutsList onSelectWorkout={setSelectedWorkoutId} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <LoginForm />
    </div>
  );
}
