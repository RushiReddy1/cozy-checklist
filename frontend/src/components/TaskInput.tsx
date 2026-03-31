type Props = {
  text: string;
  setText: (value: string) => void;
  addTask: () => void;
};

export default function TaskInput({ text, setText, addTask }: Props) {
  return (
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
        className="rounded-xl bg-pink-300 px-4 py-2 text-white transition hover:bg-pink-400"
        onClick={addTask}
      >
        Add
      </button>
    </div>
  );
}
