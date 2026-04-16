import { apiFetch } from "@/api/client";

export type Task = {
  id: number;
  text: string;
  done: boolean;
};

const BASE_URL = "/tasks";

export async function fetchTasks(checklistId: number) {
  const res = await apiFetch(`${BASE_URL}?checklist_id=${checklistId}`);

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to fetch tasks");
  }

  const data = await res.json();
  return data;
}

export async function createTask(text: string, checklistId: number) {
  const res = await apiFetch(BASE_URL, {
    method: "POST",
    body: JSON.stringify({
      text,
      checklist_id: checklistId,
    }),
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to create task");
  }

  const data = await res.json();
  return data;
}

export async function updateTask(id: number) {
  const res = await apiFetch(`${BASE_URL}/${id}`, {
    method: "PUT",
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to update task");
  }

  const data = await res.json();
  return data;
}

export async function removeTask(id: number) {
  const res = await apiFetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to delete task");
  }

  const data = await res.json();
  return data;
}
const CHECKLIST_URL = "/checklists";

export async function fetchChecklists() {
  const res = await apiFetch(CHECKLIST_URL);

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to fetch checklists");
  }

  const data = await res.json();
  return data;
}

export async function createChecklist(title: string) {
  const res = await apiFetch(CHECKLIST_URL, {
    method: "POST",
    body: JSON.stringify({ title }),
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to create checklist");
  }

  const data = await res.json();
  return data;
}
