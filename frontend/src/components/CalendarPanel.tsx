import reminderEnvelope from "../assets/reminder-envelope.svg";

type CalendarDay = {
  dayNumber: number;
  dateKey: string;
  checklistCount: number;
  reminderCount: number;
  isToday: boolean;
  isSelected: boolean;
};

type CalendarPanelProps = {
  monthLabel: string;
  selectedDateKey: string | null;
  firstDayOffset: number;
  calendarDays: CalendarDay[];
  onSelectDate: (dateKey: string) => void;
  onClearDate: () => void;
  onPreviousYear: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onNextYear: () => void;
  onOpenReminders: () => void;
};

export default function CalendarPanel({
  monthLabel,
  selectedDateKey,
  firstDayOffset,
  calendarDays,
  onSelectDate,
  onClearDate,
  onPreviousYear,
  onPreviousMonth,
  onNextMonth,
  onNextYear,
  onOpenReminders,
}: CalendarPanelProps) {
  return (
    <div className="h-fit rounded-3xl border border-pink-100 bg-white/90 p-5 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-pink-500">Calendar</p>
          <p className="text-xs text-gray-500">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-200"
            onClick={onPreviousYear}
            type="button"
          >
            «
          </button>
          <button
            className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-200"
            onClick={onPreviousMonth}
            type="button"
          >
            ‹
          </button>
          <button
            className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-200"
            onClick={onNextMonth}
            type="button"
          >
            ›
          </button>
          <button
            className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-200"
            onClick={onNextYear}
            type="button"
          >
            »
          </button>
          {selectedDateKey && (
            <button
              className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-200"
              onClick={onClearDate}
              type="button"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-pink-300">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: firstDayOffset }).map((_, index) => (
          <div key={`blank-${index}`} />
        ))}

        {calendarDays.map((day) => (
          <button
            key={day.dateKey}
            className={`relative flex h-11 flex-col items-center justify-center rounded-2xl text-sm transition ${
              day.isSelected
                ? "bg-pink-200 text-pink-700 shadow-sm"
                : day.isToday
                  ? "bg-violet-100 text-violet-700"
                  : "bg-pink-50 text-gray-600 hover:bg-pink-100"
            }`}
            onClick={() => onSelectDate(day.dateKey)}
            type="button"
          >
            <span>{day.dayNumber}</span>
            {day.checklistCount > 0 && (
              <span className="mt-0.5 text-[10px] text-pink-400">
                {day.checklistCount}
              </span>
            )}
            {day.reminderCount > 0 && (
              <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-violet-400" />
            )}
            {day.isToday && (
              <span className="absolute -top-1.5 right-1 text-xs">❤</span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Tap a date to see only the checklists created on that day.
      </p>

      <div className="mt-4 rounded-3xl border border-pink-200 bg-gradient-to-r from-pink-50 to-violet-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="calendar-envelope-float flex rounded-2xl bg-white/70 p-2 shadow-sm">
            <img
              src={reminderEnvelope}
              alt="Envelope reminder illustration"
              className="h-14 w-14"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-pink-500">
              Want to add a reminder?
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Tap below and jot it down with a date and time.
            </p>
            <button
              className="mt-3 rounded-full bg-pink-400 px-4 py-2 text-xs font-medium text-white transition hover:bg-pink-500"
              onClick={onOpenReminders}
              type="button"
            >
              Create reminder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
