const REMINDER_URL = "http://localhost:8080/reminders";
const LOCAL_REMINDER_STORAGE_KEY = "bubblydo-local-reminders";

export type Reminder = {
  id: number;
  text: string;
  remind_at: string;
  created_at: string;
};

function getLocalReminders(): Reminder[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(LOCAL_REMINDER_STORAGE_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as Reminder[];
  } catch {
    return [];
  }
}

function setLocalReminders(reminders: Reminder[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    LOCAL_REMINDER_STORAGE_KEY,
    JSON.stringify(reminders),
  );
}

export async function fetchReminders(): Promise<Reminder[]> {
  try {
    const res = await fetch(REMINDER_URL);

    if (!res.ok) {
      throw new Error("Failed to fetch reminders");
    }

    const remoteReminders = (await res.json()) as Reminder[];
    return [...remoteReminders, ...getLocalReminders()].sort((a, b) =>
      a.remind_at.localeCompare(b.remind_at),
    );
  } catch {
    return getLocalReminders();
  }
}

export async function createReminder(
  text: string,
  remindAt: string,
): Promise<Reminder> {
  try {
    const res = await fetch(REMINDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, remind_at: remindAt }),
    });

    if (!res.ok) {
      throw new Error("Failed to create reminder");
    }

    return res.json();
  } catch {
    const localReminder: Reminder = {
      id: -Date.now(),
      text,
      remind_at: remindAt,
      created_at: new Date().toISOString(),
    };
    const nextLocalReminders = [localReminder, ...getLocalReminders()];
    setLocalReminders(nextLocalReminders);
    return localReminder;
  }
}

export async function deleteReminder(id: number) {
  if (id < 0) {
    setLocalReminders(getLocalReminders().filter((reminder) => reminder.id !== id));
    return { message: "local reminder deleted" };
  }

  const res = await fetch(`${REMINDER_URL}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete reminder");
  }

  return res.json();
}
