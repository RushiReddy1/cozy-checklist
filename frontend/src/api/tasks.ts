export type Task = {
  id: number;
  text: string;
  done: boolean;
};

const BASE_URL = "http://localhost:8080/tasks";

export async function fetchTasks(checklistId: number) {
  const res = await fetch(`${BASE_URL}?checklist_id=${checklistId}`);

  if (!res.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return res.json();
}

export async function createTask(text: string, checklistId: number) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      checklist_id: checklistId,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to create task");
  }

  return res.json();
}

export async function updateTask(id: number) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
  });

  if (!res.ok) {
    throw new Error("Failed to update task");
  }

  return res.json();
}

export async function removeTask(id: number) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete task");
  }
}
const CHECKLIST_URL = "http://localhost:8080/checklists";

export async function fetchChecklists() {
  const res = await fetch(CHECKLIST_URL);

  if (!res.ok) {
    throw new Error("Failed to fetch checklists");
  }

  return res.json();
}

export async function createChecklist(title: string) {
  const res = await fetch(CHECKLIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    throw new Error("Failed to create checklist");
  }

  return res.json();
}
