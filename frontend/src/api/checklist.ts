const CHECKLIST_URL = "http://localhost:8080/checklists";

// TYPE
export type Checklist = {
  id: number;
  title: string;
  created_at: string;
};

// GET
export async function fetchChecklists(): Promise<Checklist[]> {
  const res = await fetch(CHECKLIST_URL);

  if (!res.ok) {
    throw new Error("Failed to fetch checklists");
  }

  return res.json();
}

// GET single checklist by ID
export async function fetchChecklistById(id: number): Promise<Checklist> {
  const res = await fetch(`${CHECKLIST_URL}/${id}`);

  if (!res.ok) {
    throw new Error("Failed to fetch checklist");
  }

  return res.json();
}

// POST
export async function createChecklist(title: string): Promise<Checklist> {
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

export async function updateChecklistTitle(
  id: number,
  title: string,
): Promise<Checklist> {
  const res = await fetch(`${CHECKLIST_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    throw new Error("Failed to update checklist");
  }

  return res.json();
}

export async function deleteChecklist(id: number) {
  const res = await fetch(`http://localhost:8080/checklists/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete checklist");
  }

  return res.json();
}
