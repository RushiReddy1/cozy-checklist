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
	ID   int    `json:"id"`
	Text string `json:"text"`
	Done bool   `json:"done"`
}

var tasks = []Task{
	{ID: 1, Text: "First task", Done: false},
	{ID: 2, Text: "Second task", Done: true},
}

var nextID = 3
var db *sql.DB
func main() {
	var err error
db, err = sql.Open("sqlite3", "./tasks.db")
if err != nil {
	panic(err)
}
createTableQuery := `
CREATE TABLE IF NOT EXISTS tasks (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	text TEXT NOT NULL,
	done BOOLEAN NOT NULL DEFAULT 0
);
`

_, err = db.Exec(createTableQuery)
if err != nil {
	panic(err)
}
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Backend is running")
	})

	/// Collection route: /tasks
// Handles:
// GET /tasks
// POST /tasks
	http.HandleFunc("/tasks", func(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers	
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")
w.Header().Set("Content-Type", "application/json")
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
//get all tasks
if r.Method == http.MethodGet {

	rows, err := db.Query("SELECT id, text, done FROM tasks")
	if err != nil {
		http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tasks := []Task{}

	for rows.Next() {
		var t Task
		err := rows.Scan(&t.ID, &t.Text, &t.Done)
		if err != nil {
			http.Error(w, `{"error":"scan error"}`, http.StatusInternalServerError)
			return
		}

		tasks = append(tasks, t)
	}

	json.NewEncoder(w).Encode(tasks)
	return
}

/// POST /tasks
if r.Method == http.MethodPost {
	var input struct {
		Text string `json:"text"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
		return
	}

	if input.Text == "" {
		http.Error(w, `{"error":"text is required"}`, http.StatusBadRequest)
		return
	}

	result, err := db.Exec(
		"INSERT INTO tasks (text, done) VALUES (?, ?)",
		input.Text,
		false,
	)
	if err != nil {
		http.Error(w, `{"error":"database insert failed"}`, http.StatusInternalServerError)
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		http.Error(w, `{"error":"id error"}`, http.StatusInternalServerError)
		return
	}

	newTask := Task{
		ID:   int(id),
		Text: input.Text,
		Done: false,
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newTask)
	return
}
	})
	// Single-resource route: /tasks/1
// Handles:
// GET /tasks/1
// PUT /tasks/1
// DELETE /tasks/1
	http.HandleFunc("/tasks/", func(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Type", "application/json")
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

if r.Method == http.MethodOptions {
	w.WriteHeader(http.StatusOK)
	return
}
	idStr := strings.TrimPrefix(r.URL.Path, "/tasks/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}
// GET /tasks/1
	if r.Method == http.MethodGet {
		for _, t := range tasks {
			if t.ID == id {
				json.NewEncoder(w).Encode(t)
				return
			}
		}

		http.Error(w, `{"error":"task not found"}`, http.StatusNotFound)
		return
	}
// PUT /tasks/1
if r.Method == http.MethodPut {

	result, err := db.Exec(
		"UPDATE tasks SET done = NOT done WHERE id = ?",
		id,
	)

	if err != nil {
		http.Error(w, `{"error":"database update failed"}`, http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		http.Error(w, `{"error":"rows error"}`, http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		http.Error(w, `{"error":"task not found"}`, http.StatusNotFound)
		return
	}

	var updated Task
	err = db.QueryRow(
		"SELECT id, text, done FROM tasks WHERE id = ?",
		id,
	).Scan(&updated.ID, &updated.Text, &updated.Done)

	if err != nil {
		http.Error(w, `{"error":"task not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(updated)
	return
}

// DELETE /tasks/1
if r.Method == http.MethodDelete {

	result, err := db.Exec(
		"DELETE FROM tasks WHERE id = ?",
		id,
	)

	if err != nil {
		http.Error(w, `{"error":"database delete failed"}`, http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		http.Error(w, `{"error":"rows error"}`, http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		http.Error(w, `{"error":"task not found"}`, http.StatusNotFound)
		return
	}

	w.Write([]byte(`{"message":"task deleted"}`))
	return
}
	http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
})

	fmt.Println("Server running on http://localhost:8080")
port := os.Getenv("PORT")
if port == "" {
	port = "8080"
}

fmt.Println("Server running on port", port)
http.ListenAndServe(":"+port, nil)
}