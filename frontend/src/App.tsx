import { Navigate, Routes, Route } from "react-router-dom";
import { useState } from "react";
import HomePage from "./pages/HomePage";
import ChecklistPage from "./pages/ChecklistPage";
import LoginPage from "./pages/LoginPage";
import { isAuthenticated } from "@/lib/auth";

function hasToken() {
  return isAuthenticated();
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!hasToken()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  if (hasToken()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

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
          <ProtectedRoute>
            <HomePage checklists={checklists} setChecklists={setChecklists} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checklist/:id"
        element={
          <ProtectedRoute>
            <ChecklistPage
              checklists={checklists}
              setChecklists={setChecklists}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
    </Routes>
  );
}
