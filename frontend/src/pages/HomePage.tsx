import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ChecklistCard from "../components/ChecklistCard";
import CalendarPanel from "../components/CalendarPanel";
import CuteDialog from "../components/CuteDialog";
import RemindersPanel from "../components/RemindersPanel";
import bubblydoLogo from "../assets/bubblydo-logo.svg";
import {
  createReminder,
  deleteReminder,
  fetchReminders,
  type Reminder,
} from "../api/reminders";
import {
  fetchChecklists,
  createChecklist,
  updateChecklistTitle,
} from "../api/checklist";
import { fetchTasks } from "../api/tasks";
import { deleteChecklist } from "../api/checklist";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ✅ TYPE (what backend returns)
type Checklist = {
  id: number;
  title: string;
  created_at?: string;
};

type HomePageProps = {
  checklists: {
    id: number;
    title: string;
    created_at?: string;
    tasks: { id: number; text: string; done: boolean }[];
  }[];
  setChecklists: React.Dispatch<
    React.SetStateAction<
      {
        id: number;
        title: string;
        created_at?: string;
        tasks: { id: number; text: string; done: boolean }[];
      }[]
    >
  >;
};

export default function HomePage({ checklists, setChecklists }: HomePageProps) {
  const [input, setInput] = useState("");
  const [reminderInput, setReminderInput] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderError, setReminderError] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dialogState, setDialogState] = useState({
    open: false,
    title: "",
    message: "",
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<
    "dashboard" | "all" | "today" | "reminders"
  >(
    "dashboard",
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const today = new Date();
  const [viewedMonth, setViewedMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const currentMonth = viewedMonth;
  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function capitalizeFirstLetter(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  function getDateKey(dateValue: Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getChecklistDateKey(dateValue?: string) {
    if (!dateValue) return "";
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return "";
    return getDateKey(parsedDate);
  }

  function sidebarItemClass(isActive: boolean) {
    return `w-full rounded-lg px-3 py-2 text-left text-[15px] font-semibold tracking-[0.01em] transition ${
      isActive
        ? "bg-pink-100 text-pink-600"
        : "text-pink-400 hover:bg-pink-50 hover:text-pink-500"
    } ${sidebarOpen ? "" : "flex h-12 items-center justify-center px-2 py-2 text-2xl"}`;
  }

  function showCuteDialog(title: string, message: string) {
    setDialogState({
      open: true,
      title,
      message,
    });
  }

  // 🟢 LOAD CHECKLISTS FROM BACKEND
  useEffect(() => {
    async function loadChecklists() {
      const data: Checklist[] = await fetchChecklists();

      const checklistsWithTasks = await Promise.all(
        data.map(async (c) => {
          try {
            const tasks = await fetchTasks(c.id);
            return {
              id: c.id,
              title: c.title,
              created_at: c.created_at,
              tasks,
            };
          } catch {
            console.error("Task fetch failed for checklist:", c.id);

            return {
              id: c.id,
              title: c.title,
              created_at: c.created_at,
              tasks: [], // ✅ fallback
            };
          }
        }),
      );

      setChecklists(checklistsWithTasks);
    }

    loadChecklists();
    //console.log("DATA FROM BACKEND:", data);
  }, []);

  useEffect(() => {
    async function loadReminders() {
      try {
        const data = await fetchReminders();
        setReminders(data);
      } catch (err) {
        console.error("Reminder fetch failed", err);
      }
    }

    loadReminders();
  }, []);

  // 🟢 CREATE CHECKLIST (BACKEND)
  async function handleCreateChecklist() {
    console.log("CLICKED");
    const formattedTitle = capitalizeFirstLetter(input);
    if (!formattedTitle) return;
    if (todayLists.length >= 10) {
      showCuteDialog(
        "Daily limit reached",
        "You can add only 10 checklists in one day. Try again tomorrow!",
      );
      return;
    }

    const created = await createChecklist(formattedTitle);
    console.log("CREATED:", created);
    setChecklists((prev) => [
      ...prev,
      {
        id: created.id,
        title: created.title,
        created_at: created.created_at,
        tasks: [],
      },
    ]);

    setInput("");
  }
  // 🟢 DELETE CHECKLIST (BACKEND)
  async function handleDelete(id: number) {
    await deleteChecklist(id);

    setChecklists((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleRename(id: number, title: string) {
    const updated = await updateChecklistTitle(id, title);

    setChecklists((prev) =>
      prev.map((checklist) =>
        checklist.id === id
          ? { ...checklist, title: updated.title, created_at: updated.created_at }
          : checklist,
      ),
    );
  }

  async function handleCreateReminder() {
    const trimmed = reminderInput.trim();
    if (!trimmed || !reminderDate || !reminderTime) {
      setReminderError("Please add text, date, and time.");
      return;
    }
    const remindersForDay = reminders.filter((reminder) => {
      const remindAt = new Date(reminder.remind_at);
      if (Number.isNaN(remindAt.getTime())) return false;
      return getDateKey(remindAt) === reminderDate;
    }).length;
    if (remindersForDay >= 10) {
      setReminderError("");
      showCuteDialog(
        "Daily limit reached",
        "Only 10 reminders are allowed for one day. Pick another day or clear one first!",
      );
      return;
    }

    try {
      const remindAt = `${reminderDate}T${reminderTime}:00`;
      const created = await createReminder(trimmed, remindAt);
      setReminders((prev) => [created, ...prev]);
      setReminderInput("");
      setReminderDate("");
      setReminderTime("");
      setReminderError("");
    } catch (err) {
      console.error("Reminder create failed", err);
      setReminderError("Could not save reminder right now.");
    }
  }

  async function handleDeleteReminder(id: number) {
    await deleteReminder(id);
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
  }

  const todayLists = (checklists ?? [])
    .map((item) => ({
      ...item,
      tasks: item.tasks ?? [],
    }))
    .filter((item) => {
      return getChecklistDateKey(item.created_at) === getDateKey(today);
    });

  const earlierLists = (checklists ?? [])
    .map((item) => ({
      ...item,
      tasks: item.tasks ?? [],
    }))
    .filter((item) => {
      return getChecklistDateKey(item.created_at) !== getDateKey(today);
    });

  const allLists = [...todayLists, ...earlierLists];
  const baseLists = activeView === "today" ? todayLists : allLists;
  const visibleLists = selectedDateKey
    ? baseLists.filter((item) => getChecklistDateKey(item.created_at) === selectedDateKey)
    : baseLists;
  const dashboardDateKey = selectedDateKey ?? getDateKey(today);
  const dashboardLists = allLists.filter(
    (item) => getChecklistDateKey(item.created_at) === dashboardDateKey,
  );
  const dashboardReminders = reminders.filter((reminder) => {
    const remindAt = new Date(reminder.remind_at);
    if (Number.isNaN(remindAt.getTime())) return false;
    return getDateKey(remindAt) === dashboardDateKey;
  });
  const upcomingReminders = [...dashboardReminders]
    .sort((a, b) => a.remind_at.localeCompare(b.remind_at))
    .slice(0, 4);
  const selectedDateLabel = selectedDateKey
    ? new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : null;
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstDayOffset = currentMonth.getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => {
    const dateValue = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      index + 1,
    );
    const dateKey = getDateKey(dateValue);
    const checklistCount = allLists.filter(
      (item) => getChecklistDateKey(item.created_at) === dateKey,
    ).length;
    const reminderCount = reminders.filter((reminder) => {
      const remindAt = new Date(reminder.remind_at);
      if (Number.isNaN(remindAt.getTime())) return false;
      return getDateKey(remindAt) === dateKey;
    }).length;

    return {
      dayNumber: index + 1,
      dateKey,
      checklistCount,
      reminderCount,
      isToday: dateKey === getDateKey(today),
      isSelected: selectedDateKey === dateKey,
    };
  });

  if (!checklists) return null;

  return (
    <>
      <CuteDialog
        open={dialogState.open}
        title={dialogState.title}
        message={dialogState.message}
        onClose={() =>
          setDialogState({ open: false, title: "", message: "" })
        }
      />
      <div className="flex min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-pink-200">
      <div
        className={`${
          sidebarOpen ? "w-72 p-5" : "w-24 p-2.5"
        } min-h-screen rounded-r-3xl border-r border-pink-100 bg-white/90 shadow-lg backdrop-blur transition-all duration-300`}
      >
        <div
          className={`mb-6 flex ${
            sidebarOpen
              ? "items-start justify-between gap-3"
              : "items-center justify-center"
          }`}
        >
          <img
            src={bubblydoLogo}
            alt="Bubblydo logo"
            className={`${!sidebarOpen && "hidden"} h-20 w-auto max-w-[12rem] shrink`}
          />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`shrink-0 rounded-md bg-pink-100 px-2.5 py-1.5 text-base transition hover:bg-pink-200 ${
              sidebarOpen ? "self-start" : ""
            }`}
            type="button"
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5 text-pink-600" />
            ) : (
              <ChevronRight className="h-5 w-5 text-pink-600" />
            )}
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <button
            className={sidebarItemClass(activeView === "dashboard")}
            onClick={() => setActiveView("dashboard")}
            type="button"
            title="Dashboard"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            <span aria-hidden="true">{sidebarOpen ? "Dashboard" : "⌂"}</span>
          </button>
          <button
            className={sidebarItemClass(activeView === "all")}
            onClick={() => setActiveView("all")}
            type="button"
            title="My Lists"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            <span aria-hidden="true">{sidebarOpen ? "My Lists" : "☷"}</span>
          </button>
          <button
            className={sidebarItemClass(activeView === "today")}
            onClick={() => setActiveView("today")}
            type="button"
            title="Today"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            <span aria-hidden="true">{sidebarOpen ? "Today" : "☀"}</span>
          </button>
          <button
            className={sidebarItemClass(activeView === "reminders")}
            onClick={() => setActiveView("reminders")}
            type="button"
            title="Reminders"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            <span aria-hidden="true">{sidebarOpen ? "Reminders" : "✎"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-8 py-8 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-pink-100 bg-white/85 p-6 shadow-md">
              <h1 className="homepage-glass-title text-3xl font-bold tracking-tight">
                Welcome to Bubblydo
              </h1>
              <p className="mt-4 text-sm text-gray-500">
                Organize your day, the fun way.
              </p>

              {activeView !== "reminders" && (
                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-pink-100 bg-pink-50/60 p-4 sm:flex-row sm:items-center">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Name your new list..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateChecklist();
                    }}
                  />
                  <Button onClick={handleCreateChecklist}>Create</Button>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-pink-100 bg-white/85 p-6 shadow-md">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {activeView === "dashboard"
                      ? selectedDateLabel || "Dashboard"
                      : activeView === "reminders"
                        ? "Reminders"
                      : selectedDateLabel
                      ? selectedDateLabel
                      : activeView === "today"
                        ? "Today"
                        : "My Lists"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeView === "dashboard"
                      ? selectedDateKey
                        ? "A quick view of that day’s lists and reminders"
                        : "A quick view of today’s lists and reminders"
                      : activeView === "reminders"
                        ? "All your reminders in one place"
                      : selectedDateKey
                      ? "Checklists for the selected date"
                      : activeView === "today"
                        ? "Only today’s checklists"
                        : "All your checklists in one place"}
                  </p>
                </div>
                {selectedDateKey && (
                  <button
                    className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-200"
                    onClick={() => setSelectedDateKey(null)}
                    type="button"
                  >
                    Show all
                  </button>
                )}
              </div>

              {activeView === "dashboard" ? (
                <div className="space-y-8">
                  <section>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      {selectedDateKey ? "Selected Day Checklists" : "Today’s Checklists"}
                    </h3>
                    {dashboardLists.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/40 px-6 py-10 text-center text-gray-400">
                        <p className="text-lg">
                          {selectedDateKey
                            ? "No checklists for this day."
                            : "No lists for today yet…"}
                        </p>
                        <p className="mt-1 text-sm">
                          {selectedDateKey
                            ? "Pick another day or create one for today ✨"
                            : "Create one above to get started ✨"}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {dashboardLists.map((item) => {
                          const total = item.tasks?.length ?? 0;
                          const completed = (item.tasks ?? []).filter(
                            (t) => t.done,
                          ).length;

                          return (
                            <ChecklistCard
                              key={item.id}
                              id={item.id}
                              title={item.title}
                              completed={completed}
                              total={total}
                              onDelete={handleDelete}
                              onRename={handleRename}
                              createdAt={item.created_at || ""}
                            />
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Reminder Snapshot
                    </h3>
                    {upcomingReminders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/40 px-6 py-10 text-center text-gray-400">
                        <p className="text-lg">
                          {selectedDateKey
                            ? "No reminders for this day."
                            : "No reminders yet."}
                        </p>
                        <p className="mt-1 text-sm">
                          {selectedDateKey
                            ? "Choose another day or add one in reminders ✨"
                            : "Add one from the reminders panel on the right ✨"}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {upcomingReminders.map((reminder) => (
                          <div
                            key={reminder.id}
                            className="rounded-2xl bg-pink-50 px-4 py-4"
                          >
                            <p className="text-sm font-medium text-gray-700">
                              {reminder.text}
                            </p>
                            <p className="mt-1 text-xs text-pink-500">
                              {new Date(reminder.remind_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              ) : activeView === "reminders" ? (
                <RemindersPanel
                  reminderInput={reminderInput}
                  reminderDate={reminderDate}
                  reminderTime={reminderTime}
                  reminders={reminders}
                  error={reminderError}
                  onReminderInputChange={setReminderInput}
                  onReminderDateChange={setReminderDate}
                  onReminderTimeChange={setReminderTime}
                  onCreateReminder={handleCreateReminder}
                  onDeleteReminder={handleDeleteReminder}
                />
              ) : (visibleLists?.length ?? 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/40 px-6 py-14 text-center text-gray-400">
                  <p className="text-lg">
                    {selectedDateKey
                      ? "There is nothing on this date."
                      : activeView === "today"
                        ? "No lists for today yet…"
                        : "No lists yet…"}
                  </p>
                  <p className="mt-1 text-sm">
                    {selectedDateKey
                      ? "Pick another day or create one for today ✨"
                      : activeView === "today"
                        ? "Create one today to see it here ✨"
                        : "Start your first one ✨"}
                  </p>
                </div>
              ) : selectedDateKey ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleLists.map((item) => {
                    const total = item.tasks.length;
                    const completed = item.tasks.filter((t) => t.done).length;

                    return (
                      <ChecklistCard
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        completed={completed}
                        total={total}
                        onDelete={handleDelete}
                        onRename={handleRename}
                        createdAt={item.created_at || ""}
                      />
                    );
                  })}
                </div>
              ) : activeView === "all" ? (
                <div className="space-y-8">
                  {todayLists.length > 0 && (
                    <section>
                      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                        Today
                      </h3>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {todayLists.map((item) => {
                          const total = item.tasks?.length ?? 0;
                          const completed = (item.tasks ?? []).filter(
                            (t) => t.done,
                          ).length;

                          return (
                            <ChecklistCard
                              key={item.id}
                              id={item.id}
                              title={item.title}
                              completed={completed}
                              total={total}
                              onDelete={handleDelete}
                              onRename={handleRename}
                              createdAt={item.created_at || ""}
                            />
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {earlierLists.length > 0 && (
                    <section>
                      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                        Earlier
                      </h3>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {earlierLists.map((item) => {
                          const total = item.tasks.length;
                          const completed = item.tasks.filter((t) => t.done).length;

                          return (
                            <ChecklistCard
                              key={item.id}
                              id={item.id}
                              title={item.title}
                              completed={completed}
                              total={total}
                              onDelete={handleDelete}
                              onRename={handleRename}
                              createdAt={item.created_at || ""}
                            />
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {todayLists.map((item) => {
                    const total = item.tasks.length;
                    const completed = item.tasks.filter((t) => t.done).length;

                    return (
                      <ChecklistCard
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        completed={completed}
                        total={total}
                        onDelete={handleDelete}
                        onRename={handleRename}
                        createdAt={item.created_at || ""}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <CalendarPanel
              monthLabel={monthLabel}
              selectedDateKey={selectedDateKey}
              firstDayOffset={firstDayOffset}
              calendarDays={calendarDays}
              onSelectDate={setSelectedDateKey}
              onClearDate={() => setSelectedDateKey(null)}
              onPreviousYear={() =>
                setViewedMonth(
                  new Date(
                    currentMonth.getFullYear() - 1,
                    currentMonth.getMonth(),
                    1,
                  ),
                )
              }
              onPreviousMonth={() =>
                setViewedMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1,
                    1,
                  ),
                )
              }
              onNextMonth={() =>
                setViewedMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1,
                    1,
                  ),
                )
              }
              onNextYear={() =>
                setViewedMonth(
                  new Date(
                    currentMonth.getFullYear() + 1,
                    currentMonth.getMonth(),
                    1,
                  ),
                )
              }
              onOpenReminders={() => setActiveView("reminders")}
            />
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
