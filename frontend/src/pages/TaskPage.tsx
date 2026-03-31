import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createTask, fetchTasks, removeTask, updateTask } from "../api/tasks";
import type { Task } from "../api/tasks";
import TaskItem from "../components/TaskItem";
import TaskInput from "../components/TaskInput";
//main TaskPage component
export default function TaskPage() {
  const { id } = useParams();
  const checklistId = Number(id);
  const hasValidChecklistId = Number.isFinite(checklistId) && checklistId > 0;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!hasValidChecklistId) {
      setError("Checklist not found");
      setLoading(false);
      return;
    }

    async function loadTasks() {
      try {
        const data = await fetchTasks(checklistId);
        setTasks(data);
        setError("");
      } catch {
        setError("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [checklistId, hasValidChecklistId]);

  //showing a loading state while tasks are being fetched
  if (loading) {
    return <p className="text-center mt-6">Loading tasks...</p>;
  }
  //adding a task with error handling, using the createTask helper function to keep code clean and reusable
  async function addTask() {
    const t = text.trim();
    if (!t) return;

    try {
      const task = await createTask(t, checklistId);
      setTasks((prev) => [...prev, task]);
      setText("");
    } catch {
      setError("Failed to add task");
    }
  }
  //deleting a task with error handling, using the removeTask helper function to keep code clean and reusable
  async function deleteTask(id: number) {
    try {
      await removeTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("Failed to delete task");
    }
  }
  //toggling a task's done status with error handling, using the updateTask helper function to keep code clean and reusable
  async function toggleTask(id: number) {
    try {
      const updatedTask = await updateTask(id);

      setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
    } catch {
      setError("Failed to update task");
    }
  }
  //ui of the app, using Tailwind CSS for styling and conditional rendering for error messages and empty state
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-6">
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl bg-white/70 p-5 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold">Mini To-Do ✨</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <TaskInput text={text} setText={setText} addTask={addTask} />
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              toggleTask={toggleTask}
              deleteTask={deleteTask}
            />
          ))}
        </ul>

        {tasks.length === 0 && (
          <p className="text-sm text-slate-500">
            No tasks yet. Add your first one ✨
          </p>
        )}
      </div>
    </div>
  );
}
