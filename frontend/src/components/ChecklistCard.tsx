import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  id: number;
  title: string;
  completed: number;
  total: number;
  onDelete: (id: number) => void;
  onRename: (id: number, title: string) => Promise<void>;
  createdAt: string;
};

export default function ChecklistCard({
  id,
  title,
  completed,
  total,
  createdAt,
  onDelete,
  onRename,
}: Props) {
  const navigate = useNavigate();
  const progress = total === 0 ? 0 : (completed / total) * 100;
  const clampedProgress = Math.max(0, Math.min(progress, 100));
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimatedProgress(clampedProgress);
    });

    return () => cancelAnimationFrame(frame);
  }, [clampedProgress]);

  function formatDate(dateString: string) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function getProgressMessage(progressValue: number) {
    if (progressValue >= 100) return "Yey u did it! 🥰";
    if (progressValue >= 90) return "Almost there! 😍";
    if (progressValue >= 60) return "So good! 😊";
    if (progressValue >= 30) return "Nice start! 🙂";
    return "You got this! 💖";
  }

  async function saveTitle() {
    const trimmed = draftTitle.trim();

    if (!trimmed) {
      setDraftTitle(title);
      setIsEditingTitle(false);
      return;
    }

    if (trimmed === title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      setIsSavingTitle(true);
      await onRename(id, trimmed);
      setIsEditingTitle(false);
    } finally {
      setIsSavingTitle(false);
    }
  }

  return (
    <div
      className="group cursor-pointer transition duration-200 hover:scale-[1.02] hover:shadow-lg"
      onClick={() => {
        if (!isEditingTitle) {
          navigate(`/checklist/${id}`);
        }
      }}
    >
      <Card className="bg-white/90 border border-pink-200">
        <CardContent className="p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {isEditingTitle ? (
                <div
                  className="space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-pink-400"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void saveTitle();
                      }

                      if (e.key === "Escape") {
                        setDraftTitle(title);
                        setIsEditingTitle(false);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      className="rounded-md bg-pink-100 px-2 py-1 text-pink-600 transition hover:bg-pink-200 disabled:opacity-50"
                      disabled={isSavingTitle}
                      onClick={() => void saveTitle()}
                      type="button"
                    >
                      Save
                    </button>
                    <button
                      className="rounded-md bg-slate-100 px-2 py-1 text-slate-500 transition hover:bg-slate-200"
                      onClick={() => {
                        setDraftTitle(title);
                        setIsEditingTitle(false);
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  aria-label="Edit checklist name"
                  className="block max-w-full rounded-md text-left transition hover:bg-pink-50/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDraftTitle(title);
                    setIsEditingTitle(true);
                  }}
                  type="button"
                >
                  <h2
                    className="break-words text-xl font-bold text-pink-500"
                    style={{ fontFamily: "'Baloo 2', cursive" }}
                  >
                    {title}
                  </h2>
                </button>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              className="text-muted-foreground transition hover:text-destructive"
              type="button"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>{formatDate(createdAt)}</span>
            <span className="font-medium text-violet-400">
              {Math.round(clampedProgress)}%
            </span>
          </div>

          <div className="relative mb-2 h-2 w-full rounded-full bg-violet-100">
            <div
              className="h-full rounded-full rounded-full bg-violet-300 transition-all duration-500"
              style={{
                width: `${animatedProgress}%`,
                minWidth: animatedProgress > 0 ? "0.75rem" : "0",
              }}
            />
            {animatedProgress > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-3 z-10 text-xs text-pink-500 drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)] transition-all duration-500"
                style={{
                  left: `clamp(0.2rem, calc(${animatedProgress}% - 0.35rem), calc(100% - 0.9rem))`,
                }}
              >
                ❤
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {completed} / {total} tasks
          </p>
          <p className="mt-1 text-sm text-violet-500">
            {getProgressMessage(clampedProgress)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
