import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import type { Checklist } from "../api/checklist";
import { fetchChecklistById } from "../api/checklist";
import {
  createTask,
  fetchTasks,
  removeTask,
  updateTask,
  type Task,
} from "../api/tasks";
import TaskInput from "../components/TaskInput";
import TaskItem from "../components/TaskItem";

type ChecklistPageProps = {
  checklists: {
    id: number;
    title: string;
    created_at?: string;
    tasks: Task[];
  }[];
  setChecklists: Dispatch<
    SetStateAction<
      {
        id: number;
        title: string;
        created_at?: string;
        tasks: Task[];
      }[]
    >
  >;
};

export default function ChecklistPage({
  checklists,
  setChecklists,
}: ChecklistPageProps) {
  const { id } = useParams();
  const checklistId = Number(id);
  const [text, setText] = useState("");
  const [currentChecklist, setCurrentChecklist] = useState<Checklist | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isFinite(checklistId) || checklistId <= 0) {
      console.error("ChecklistPage: invalid checklist id", id);
      setError("Invalid checklist URL");
      setLoading(false);
      return;
    }

    async function loadChecklistPage() {
      try {
        console.log("ChecklistPage: loading checklist", checklistId);

        const [checklistData, taskData] = await Promise.all([
          fetchChecklistById(checklistId),
          fetchTasks(checklistId),
        ]);

        console.log("ChecklistPage: checklist fetched", checklistData);
        console.log("ChecklistPage: tasks fetched", taskData);

        setCurrentChecklist(checklistData);
        setChecklists((prev) => {
          const exists = prev.some((c) => c.id === checklistId);

          if (exists) {
            return prev.map((c) =>
              c.id === checklistId
                ? { ...c, title: checklistData.title, tasks: taskData }
                : c,
            );
          }

          return [
            ...prev,
            {
              id: checklistData.id,
              title: checklistData.title,
              tasks: taskData,
            },
          ];
        });
        setError("");
      } catch (err) {
        console.error("ChecklistPage: failed to load checklist page", err);
        setError("Failed to load checklist");
      } finally {
        setLoading(false);
      }
    }

    loadChecklistPage();
  }, [checklistId, id, setChecklists]);

  const checklist = checklists.find((c) => c.id === checklistId);
  const tasks = checklist?.tasks ?? [];
  const completedTasks = tasks.filter((task) => task.done).length;
  const progress = tasks.length === 0 ? 0 : (completedTasks / tasks.length) * 100;
  const formattedDay = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function getProgressMessage(progressValue: number) {
    if (progressValue >= 100) return "Yey u did it! 🥰";
    if (progressValue >= 90) return "Almost there! 😍";
    if (progressValue >= 60) return "So good! 😊";
    if (progressValue >= 30) return "Nice start! 🙂";
    return "You got this! 💖";
  }

  function updateChecklist(
    updater: (tasks: Task[]) => Task[],
  ) {
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              title: currentChecklist?.title ?? c.title,
              tasks: updater(c.tasks ?? []),
            }
          : c,
      ),
    );
  }

  async function addTask() {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      console.log("ChecklistPage: creating task", {
        checklistId,
        text: trimmed,
      });
      const created = await createTask(trimmed, checklistId);
      console.log("ChecklistPage: task created", created);
      updateChecklist((tasks) => [...tasks, created]);
      setText("");
    } catch (err) {
      console.error("ChecklistPage: failed to create task", err);
      setError("Failed to create task");
    }
  }

  async function toggleTask(taskId: number) {
    try {
      console.log("ChecklistPage: toggling task", { checklistId, taskId });
      await updateTask(taskId);
      updateChecklist((tasks) =>
        tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
      );
    } catch (err) {
      console.error("ChecklistPage: failed to toggle task", err);
      setError("Failed to update task");
    }
  }

  async function deleteTask(taskId: number) {
    try {
      console.log("ChecklistPage: deleting task", { checklistId, taskId });
      await removeTask(taskId);
      updateChecklist((tasks) => tasks.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("ChecklistPage: failed to delete task", err);
      setError("Failed to delete task");
    }
  }

  if (loading) {
    return <p className="p-6 text-center">Loading checklist...</p>;
  }

  if (error) {
    return <p className="p-6 text-center text-red-500">{error}</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-pink-300 flex justify-center pt-12 px-6">
      <Card className="w-full max-w-xl rounded-3xl bg-white border-2 border-dashed border-pink-300 shadow-md">
        <CardContent className="p-6 space-y-6 relative">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-between mb-2">
              {/* LEFT: Back */}
              <button
                onClick={() => window.history.back()}
                className="text-sm text-gray-500 transition hover:text-black"
              >
                ← Back
              </button>

              {/* Empty space for balance */}
              <div className="w-12" />
            </div>
            <div className="absolute right-4 top-4 rounded-full bg-pink-100 px-3 py-1 text-[11px] font-semibold text-pink-500 shadow-sm">
              <span className="mr-1">❤</span>
              {formattedDay}
            </div>
            {/* Title */}
            <h1
              className="text-center text-3xl font-bold text-pink-500"
              style={{ fontFamily: "'Baloo 2', cursive" }}
            >
              {checklist?.title || "Checklist"}
            </h1>
            <p className="text-sm text-gray-500">
              Keep going — small steps matter ✨
            </p>
            <p className="mt-2 text-sm text-violet-500">
              {getProgressMessage(progress)}
            </p>
            {/* RIGHT: placeholder (keeps spacing balanced) */}
            <div className="w-12" />
          </div>

          <div className="rounded-xl border border-pink-200 bg-white/70 p-3 shadow-sm">
            <TaskInput text={text} setText={setText} addTask={addTask} />
          </div>

          <div className="mt-4 space-y-2">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-pink-400">
                <p className="text-3xl">📝</p>
                <p className="mt-2 text-sm">Nothing here yet</p>
                <p className="text-xs">Let’s scribble something ✏️</p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  toggleTask={toggleTask}
                  deleteTask={deleteTask}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
