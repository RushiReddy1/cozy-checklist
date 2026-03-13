export type Task = {
  id: number;
  text: string;
  done: boolean;
};

const BASE_URL = "http://localhost:8080/tasks";

export async function fetchTasks() {
  const res = await fetch(BASE_URL);

  if (!res.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return res.json();
}

export async function createTask(text: string) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
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
