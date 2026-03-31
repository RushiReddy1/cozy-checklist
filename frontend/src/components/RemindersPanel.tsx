import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Reminder } from "../api/reminders";

type RemindersPanelProps = {
  reminderInput: string;
  reminderDate: string;
  reminderTime: string;
  reminders: Reminder[];
  error: string;
  onReminderInputChange: (value: string) => void;
  onReminderDateChange: (value: string) => void;
  onReminderTimeChange: (value: string) => void;
  onCreateReminder: () => void | Promise<void>;
  onDeleteReminder: (id: number) => void | Promise<void>;
};

export default function RemindersPanel({
  reminderInput,
  reminderDate,
  reminderTime,
  reminders,
  error,
  onReminderInputChange,
  onReminderDateChange,
  onReminderTimeChange,
  onCreateReminder,
  onDeleteReminder,
}: RemindersPanelProps) {
  function formatReminderDateTime(remindAt: string) {
    if (!remindAt) return "";
    const parsed = new Date(remindAt);
    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="h-fit rounded-3xl border border-pink-100 bg-white/90 p-5 shadow-md">
      <div className="mb-4">
        <p className="text-sm font-semibold text-pink-500">Reminders</p>
        <p className="text-xs text-gray-500">
          Add a note with the date and time you want.
        </p>
      </div>

      <div className="space-y-3">
        <Input
          className="border-pink-200 bg-pink-50/60 focus-visible:ring-pink-300"
          value={reminderInput}
          onChange={(e) => onReminderInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void onCreateReminder();
            }
          }}
          placeholder="Add a reminder..."
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            className="border-pink-200 bg-pink-50/60 text-pink-600 focus-visible:ring-pink-300"
            type="date"
            value={reminderDate}
            onChange={(e) => onReminderDateChange(e.target.value)}
          />
          <Input
            className="border-pink-200 bg-pink-50/60 text-pink-600 focus-visible:ring-pink-300"
            type="time"
            value={reminderTime}
            onChange={(e) => onReminderTimeChange(e.target.value)}
          />
        </div>
        <Button
          className="w-full bg-pink-400 text-white hover:bg-pink-500"
          onClick={() => void onCreateReminder()}
        >
          Add Reminder
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}

      {reminders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pink-200 bg-pink-50/50 px-4 py-6 text-center text-sm text-gray-400">
          No reminders yet.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="rounded-2xl bg-pink-50 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700">{reminder.text}</p>
                  <p className="mt-1 text-xs text-pink-500">
                    {formatReminderDateTime(reminder.remind_at)}
                  </p>
                </div>
                <button
                  className="text-xs text-pink-500 transition hover:text-pink-700"
                  onClick={() => void onDeleteReminder(reminder.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
