import { apiFetch } from "@/api/client";

const CHECKLIST_URL = "/checklists";

// TYPE
export type Checklist = {
  id: number;
  title: string;
  created_at: string;
};

// GET
export async function fetchChecklists(): Promise<Checklist[]> {
  const res = await apiFetch(CHECKLIST_URL);

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to fetch checklists");
  }

  const data = (await res.json()) as Checklist[];
  return data;
}

// GET single checklist by ID
export async function fetchChecklistById(id: number): Promise<Checklist> {
  const res = await apiFetch(`${CHECKLIST_URL}/${id}`);

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to fetch checklist");
  }

  const data = (await res.json()) as Checklist;
  return data;
}

// POST
export async function createChecklist(title: string): Promise<Checklist> {
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

  const data = (await res.json()) as Checklist;
  return data;
}

export async function updateChecklistTitle(
  id: number,
  title: string,
): Promise<Checklist> {
  const res = await apiFetch(`${CHECKLIST_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to update checklist");
  }

  const data = (await res.json()) as Checklist;
  return data;
}

export async function deleteChecklist(id: number) {
  const res = await apiFetch(`${CHECKLIST_URL}/${id}`, {
    method: "DELETE",
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to delete checklist");
  }

  const data = await res.json();
  return data;
}
