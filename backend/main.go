package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

type Task struct {
	ID          int    `json:"id"`
	Text        string `json:"text"`
	Done        bool   `json:"done"`
	ChecklistID int    `json:"checklist_id"`
}

type Checklist struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	CreatedAt string `json:"created_at"`
}

type Reminder struct {
	ID        int    `json:"id"`
	Text      string `json:"text"`
	RemindAt  string `json:"remind_at"`
	CreatedAt string `json:"created_at"`
}

var db *sql.DB

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func parseID(path, prefix string) (int, error) {
	idStr := strings.TrimPrefix(path, prefix)
	return strconv.Atoi(idStr)
}

func handleTasks(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	switch r.Method {
	case http.MethodGet:
		checklistID := r.URL.Query().Get("checklist_id")

		var (
			rows *sql.Rows
			err  error
		)

		if checklistID != "" {
			rows, err = db.Query(
				"SELECT id, text, done, checklist_id FROM tasks WHERE checklist_id = ? ORDER BY id",
				checklistID,
			)
		} else {
			rows, err = db.Query("SELECT id, text, done, checklist_id FROM tasks ORDER BY id")
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "database error")
			return
		}
		defer rows.Close()

		var tasks []Task
		for rows.Next() {
			var task Task
			if err := rows.Scan(&task.ID, &task.Text, &task.Done, &task.ChecklistID); err != nil {
				writeError(w, http.StatusInternalServerError, "scan error")
				return
			}
			tasks = append(tasks, task)
		}

		writeJSON(w, http.StatusOK, tasks)

	case http.MethodPost:
		var input struct {
			Text        string `json:"text"`
			ChecklistID int    `json:"checklist_id"`
		}

		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if strings.TrimSpace(input.Text) == "" {
			writeError(w, http.StatusBadRequest, "text is required")
			return
		}
		if input.ChecklistID <= 0 {
			writeError(w, http.StatusBadRequest, "checklist_id is required")
			return
		}

		result, err := db.Exec(
			"INSERT INTO tasks (text, done, checklist_id) VALUES (?, ?, ?)",
			strings.TrimSpace(input.Text),
			false,
			input.ChecklistID,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "database insert failed")
			return
		}

		id, err := result.LastInsertId()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "id error")
			return
		}

		writeJSON(w, http.StatusCreated, Task{
			ID:          int(id),
			Text:        strings.TrimSpace(input.Text),
			Done:        false,
			ChecklistID: input.ChecklistID,
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleTaskByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	id, err := parseID(r.URL.Path, "/tasks/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var task Task
		err := db.QueryRow(
			"SELECT id, text, done, checklist_id FROM tasks WHERE id = ?",
			id,
		).Scan(&task.ID, &task.Text, &task.Done, &task.ChecklistID)
		if err != nil {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}

		writeJSON(w, http.StatusOK, task)

	case http.MethodPut:
		result, err := db.Exec("UPDATE tasks SET done = NOT done WHERE id = ?", id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "database update failed")
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "rows error")
			return
		}
		if rowsAffected == 0 {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}

		var updated Task
		err = db.QueryRow(
			"SELECT id, text, done, checklist_id FROM tasks WHERE id = ?",
			id,
		).Scan(&updated.ID, &updated.Text, &updated.Done, &updated.ChecklistID)
		if err != nil {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}

		writeJSON(w, http.StatusOK, updated)

	case http.MethodDelete:
		result, err := db.Exec("DELETE FROM tasks WHERE id = ?", id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "database delete failed")
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "rows error")
			return
		}
		if rowsAffected == 0 {
			writeError(w, http.StatusNotFound, "task not found")
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "task deleted"})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleReminders(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.URL.Path != "/reminders" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query("SELECT id, text, remind_at, created_at FROM reminders ORDER BY remind_at ASC, id DESC")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "database error")
			return
		}
		defer rows.Close()

		var reminders []Reminder
		for rows.Next() {
			var reminder Reminder
			if err := rows.Scan(&reminder.ID, &reminder.Text, &reminder.RemindAt, &reminder.CreatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "scan error")
				return
			}
			reminders = append(reminders, reminder)
		}

		writeJSON(w, http.StatusOK, reminders)

	case http.MethodPost:
		var input struct {
			Text     string `json:"text"`
			RemindAt string `json:"remind_at"`
		}

		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}

		text := strings.TrimSpace(input.Text)
		if text == "" {
			writeError(w, http.StatusBadRequest, "text is required")
			return
		}
		remindAt := strings.TrimSpace(input.RemindAt)
		if remindAt == "" {
			writeError(w, http.StatusBadRequest, "remind_at is required")
			return
		}

		result, err := db.Exec("INSERT INTO reminders (text, remind_at) VALUES (?, ?)", text, remindAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "insert failed")
			return
		}

		id, err := result.LastInsertId()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "id error")
			return
		}

		var reminder Reminder
		err = db.QueryRow(
			"SELECT id, text, remind_at, created_at FROM reminders WHERE id = ?",
			id,
		).Scan(&reminder.ID, &reminder.Text, &reminder.RemindAt, &reminder.CreatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "fetch failed")
			return
		}

		writeJSON(w, http.StatusCreated, reminder)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleReminderByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	id, err := parseID(r.URL.Path, "/reminders/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	switch r.Method {
	case http.MethodDelete:
		result, err := db.Exec("DELETE FROM reminders WHERE id = ?", id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "delete failed")
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "rows error")
			return
		}
		if rowsAffected == 0 {
			writeError(w, http.StatusNotFound, "not found")
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "reminder deleted"})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleChecklists(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.URL.Path != "/checklists" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query("SELECT id, title, created_at FROM checklists ORDER BY id")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "database error")
			return
		}
		defer rows.Close()

		var lists []Checklist
		for rows.Next() {
			var checklist Checklist
			if err := rows.Scan(&checklist.ID, &checklist.Title, &checklist.CreatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "scan error")
				return
			}
			lists = append(lists, checklist)
		}

		writeJSON(w, http.StatusOK, lists)

	case http.MethodPost:
		var input struct {
			Title string `json:"title"`
		}

		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if strings.TrimSpace(input.Title) == "" {
			writeError(w, http.StatusBadRequest, "title is required")
			return
		}

		result, err := db.Exec("INSERT INTO checklists (title) VALUES (?)", strings.TrimSpace(input.Title))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "insert failed")
			return
		}

		id, err := result.LastInsertId()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "id error")
			return
		}

		var checklist Checklist
		err = db.QueryRow(
			"SELECT id, title, created_at FROM checklists WHERE id = ?",
			id,
		).Scan(&checklist.ID, &checklist.Title, &checklist.CreatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "fetch failed")
			return
		}

		writeJSON(w, http.StatusCreated, checklist)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func handleChecklistByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	id, err := parseID(r.URL.Path, "/checklists/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var checklist Checklist
		err := db.QueryRow(
			"SELECT id, title, created_at FROM checklists WHERE id = ?",
			id,
		).Scan(&checklist.ID, &checklist.Title, &checklist.CreatedAt)
		if err != nil {
			writeError(w, http.StatusNotFound, "not found")
			return
		}

		writeJSON(w, http.StatusOK, checklist)

	case http.MethodPut:
		var input struct {
			Title string `json:"title"`
		}

		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}

		title := strings.TrimSpace(input.Title)
		if title == "" {
			writeError(w, http.StatusBadRequest, "title is required")
			return
		}

		result, err := db.Exec("UPDATE checklists SET title = ? WHERE id = ?", title, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "update failed")
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "rows error")
			return
		}
		if rowsAffected == 0 {
			writeError(w, http.StatusNotFound, "not found")
			return
		}

		var checklist Checklist
		err = db.QueryRow(
			"SELECT id, title, created_at FROM checklists WHERE id = ?",
			id,
		).Scan(&checklist.ID, &checklist.Title, &checklist.CreatedAt)
		if err != nil {
			writeError(w, http.StatusNotFound, "not found")
			return
		}

		writeJSON(w, http.StatusOK, checklist)

	case http.MethodDelete:
		if _, err := db.Exec("DELETE FROM tasks WHERE checklist_id = ?", id); err != nil {
			writeError(w, http.StatusInternalServerError, "delete failed")
			return
		}

		result, err := db.Exec("DELETE FROM checklists WHERE id = ?", id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "delete failed")
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "rows error")
			return
		}
		if rowsAffected == 0 {
			writeError(w, http.StatusNotFound, "not found")
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "checklist deleted"})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func main() {
	var err error

	db, err = sql.Open("sqlite3", "./tasks.db")
	if err != nil {
		panic(err)
	}
	defer db.Close()

	createChecklistTable := `
	CREATE TABLE IF NOT EXISTS checklists (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	createTaskTable := `
	CREATE TABLE IF NOT EXISTS tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		text TEXT NOT NULL,
		done BOOLEAN NOT NULL DEFAULT 0,
		checklist_id INTEGER NOT NULL
	);`

	createReminderTable := `
	CREATE TABLE IF NOT EXISTS reminders (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		text TEXT NOT NULL,
		remind_at TEXT NOT NULL DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := db.Exec(createChecklistTable); err != nil {
		panic(err)
	}
	if _, err := db.Exec(createTaskTable); err != nil {
		panic(err)
	}
	if _, err := db.Exec(createReminderTable); err != nil {
		panic(err)
	}
	if _, err := db.Exec("ALTER TABLE reminders ADD COLUMN remind_at TEXT NOT NULL DEFAULT ''"); err != nil {
		if !strings.Contains(err.Error(), "duplicate column name") {
			panic(err)
		}
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Backend is running")
	})
	http.HandleFunc("/tasks", handleTasks)
	http.HandleFunc("/tasks/", handleTaskByID)
	http.HandleFunc("/checklists", handleChecklists)
	http.HandleFunc("/checklists/", handleChecklistByID)
	http.HandleFunc("/reminders", handleReminders)
	http.HandleFunc("/reminders/", handleReminderByID)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Server running on http://localhost:" + port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		panic(err)
	}
}
