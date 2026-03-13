import { useEffect, useState } from "react";
import { createTask, fetchTasks, removeTask, updateTask } from "./api/tasks";
import type { Task } from "./api/tasks";

//main App component
export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
const [tasks, setTasks] = useState<Task[]>([]);
useEffect(() => {
  async function loadTasks() {
    try {
      const data = await fetchTasks();
      setTasks(data);
      setError("");
    } catch {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  loadTasks();
}, []);

//showing a loading state while tasks are being fetched
if (loading) {
  return <p className="text-center mt-6">Loading tasks...</p>;
}    
//adding a task with error handling, using the createTask helper function to keep code clean and reusable
async function addTask() {
  const t = text.trim();
  if (!t) return;

  try {
    const task = await createTask(t);
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

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? updatedTask : t))
    );
  } catch {
    setError("Failed to update task");
  }
}
//ui of the app, using Tailwind CSS for styling and conditional rendering for error messages and empty state
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-6">
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl bg-white/70 p-5 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold">Mini To-Do ✨</h1>

{error && (
  <p className="text-sm text-red-600">
    {error}
  </p>
)}
        <div className="flex gap-2">
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-400"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
            placeholder="Add a task…"
          />
          <button
            className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
            onClick={addTask}
          >
            Add
          </button>
        </div>

        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              {/* LEFT side: checkbox + title */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  className="h-4 w-4 accent-black"
                />

                <span
                  className={task.done ? "text-slate-400 line-through" : ""}
                >
                  {task.text}
                </span>
              </div>

              {/* RIGHT side: delete (separate container) */}
              <div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-sm text-rose-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
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
