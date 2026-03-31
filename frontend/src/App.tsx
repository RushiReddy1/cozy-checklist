import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import HomePage from "./pages/HomePage";
import ChecklistPage from "./pages/ChecklistPage";

export default function App() {
  const [checklists, setChecklists] = useState<
    {
      id: number;
      title: string;
      created_at?: string;
      tasks: { id: number; text: string; done: boolean }[];
    }[]
  >([]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage checklists={checklists} setChecklists={setChecklists} />
        }
      />
      <Route
        path="/checklist/:id"
        element={
          <ChecklistPage
            checklists={checklists}
            setChecklists={setChecklists}
          />
        }
      />
    </Routes>
  );
}
