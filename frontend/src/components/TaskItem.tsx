import type { Task } from "../api/tasks";

type Props = {
  task: Task;
  toggleTask: (id: number) => void;
  deleteTask: (id: number) => void;
};

export default function TaskItem({ task, toggleTask, deleteTask }: Props) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-pink-50 px-4 py-3 border border-pink-200 transition hover:bg-pink-100">
      {/* LEFT: checkbox + text */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => toggleTask(task.id)}
          className="h-5 w-5 accent-pink-500 cursor-pointer"
        />

        <span
          className={`text-sm ${
            task.done ? "line-through text-gray-400" : "text-gray-700"
          }`}
        >
          {task.text}
        </span>
      </div>

      {/* RIGHT: delete */}
      <button
        onClick={() => deleteTask(task.id)}
        className="text-gray-400 hover:text-red-400 transition"
      >
        ✕
      </button>
    </div>
  );
}
