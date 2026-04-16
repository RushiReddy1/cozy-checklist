package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode"

	"context"
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
	"time"
)

var db *sql.DB

// ---------- STRUCTS ----------

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
	ID       int    `json:"id"`
	Text     string `json:"text"`
	RemindAt string `json:"remind_at"`
}

type AuthUser struct {
	ID        int    `json:"id"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
}

type AuthResponse struct {
	Token string   `json:"token"`
	User  AuthUser `json:"user"`
}

// ---------- HELPERS ----------

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Writes error message as JSON response
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// Parses ID from URL path based on given prefix
func parseID(path, prefix string) (int, error) {
	idStr := strings.TrimPrefix(path, prefix)
	return strconv.Atoi(idStr)
}

func ensureUsersSchema() error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			first_name TEXT NOT NULL DEFAULT '',
			last_name TEXT NOT NULL DEFAULT '',
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL
		)
	`)
	if err != nil {
		return err
	}

	for _, column := range []string{"first_name", "last_name"} {
		exists, err := userColumnExists(column)
		if err != nil {
			return err
		}
		if exists {
			continue
		}

		_, err = db.Exec(
			fmt.Sprintf(
				"ALTER TABLE users ADD COLUMN %s TEXT NOT NULL DEFAULT ''",
				column,
			),
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func userColumnExists(columnName string) (bool, error) {
	rows, err := db.Query("PRAGMA table_info(users)")
	if err != nil {
		return false, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			cid        int
			name       string
			columnType string
			notNull    int
			defaultVal sql.NullString
			primaryKey int
		)

		if err := rows.Scan(
			&cid,
			&name,
			&columnType,
			&notNull,
			&defaultVal,
			&primaryKey,
		); err != nil {
			return false, err
		}

		if name == columnName {
			return true, nil
		}
	}

	return false, rows.Err()
}

func passwordMatchesStandard(password string) bool {
	if len(password) < 8 {
		return false
	}

	var hasUpper bool
	var hasLower bool
	var hasNumber bool
	var hasSpecial bool

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasNumber = true
		default:
			hasSpecial = true
		}
	}

	return hasUpper && hasLower && hasNumber && hasSpecial
}

func buildAuthResponse(userID int, firstName, lastName, email string) (AuthResponse, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte("secret"))
	if err != nil {
		return AuthResponse{}, err
	}

	return AuthResponse{
		Token: tokenString,
		User: AuthUser{
			ID:        userID,
			FirstName: firstName,
			LastName:  lastName,
			Email:     email,
		},
	}, nil
}

// Extracts user ID from JWT token in Authorization header
func getUserID(r *http.Request) (int, error) {
	authHeader := r.Header.Get("Authorization")

	if authHeader == "" {
		return 0, fmt.Errorf("missing token")
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte("secret"), nil
	})

	if err != nil || !token.Valid {
		return 0, fmt.Errorf("invalid token")
	}

	claims := token.Claims.(jwt.MapClaims)
	userID := int(claims["user_id"].(float64))

	return userID, nil
}

//---------- AUTH MIDDLEWARE ----------

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			enableCORS(w)
			w.WriteHeader(http.StatusOK)
			return
		}

		userID, err := getUserID(r)
		if err != nil {
			enableCORS(w)
			writeError(w, 401, "unauthorized")
			return
		}

		// store userID in request context
		ctx := context.WithValue(r.Context(), "userID", userID)

		next(w, r.WithContext(ctx))
	}
}

// ---------- TASKS ----------

func handleTasks(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	switch r.Method {

	case http.MethodGet:
		checklistID := r.URL.Query().Get("checklist_id")

		var rows *sql.Rows
		var err error

		if checklistID != "" {
			rows, err = db.Query(
				"SELECT id, text, done, checklist_id FROM tasks WHERE checklist_id = ? ORDER BY id",
				checklistID,
			)
		} else {
			userID := r.Context().Value("userID").(int)

			rows, err = db.Query(
				`SELECT t.id, t.text, t.done, t.checklist_id
				 FROM tasks t
				 JOIN checklists c ON t.checklist_id = c.id
				 WHERE c.user_id = ?
				 ORDER BY t.id`,
				userID,
			)
		}

		if err != nil {
			writeError(w, 500, "database error")
			return
		}
		defer rows.Close()

		tasks := []Task{}

		for rows.Next() {
			var t Task
			rows.Scan(&t.ID, &t.Text, &t.Done, &t.ChecklistID)
			tasks = append(tasks, t)
		}

		writeJSON(w, 200, tasks)

	case http.MethodPost:
		var input struct {
			Text        string `json:"text"`
			ChecklistID int    `json:"checklist_id"`
		}

		json.NewDecoder(r.Body).Decode(&input)

		if strings.TrimSpace(input.Text) == "" {
			writeError(w, 400, "text required")
			return
		}

		if input.ChecklistID <= 0 {
			writeError(w, 400, "checklist_id required")
			return
		}
		userID := r.Context().Value("userID").(int)
		var ownerID int

		err := db.QueryRow(
			"SELECT user_id FROM checklists WHERE id = ?",
			input.ChecklistID,
		).Scan(&ownerID)

		if err != nil {
			writeError(w, 404, "checklist not found")
			return
		}

		if ownerID != userID {
			writeError(w, 403, "not your checklist")
			return
		}

		result, err := db.Exec(
			"INSERT INTO tasks (text, done, checklist_id) VALUES (?, ?, ?)",
			input.Text,
			false,
			input.ChecklistID,
		)

		if err != nil {
			writeError(w, 500, "insert failed")
			return
		}

		id, _ := result.LastInsertId()

		writeJSON(w, 201, Task{
			ID:          int(id),
			Text:        input.Text,
			Done:        false,
			ChecklistID: input.ChecklistID,
		})

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------- TASK BY ID ----------

func handleTaskByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	id, err := parseID(r.URL.Path, "/tasks/")
	if err != nil {
		writeError(w, 400, "invalid id")
		return
	}

	switch r.Method {

	case http.MethodPut:
		_, err := db.Exec("UPDATE tasks SET done = NOT done WHERE id = ?", id)
		if err != nil {
			writeError(w, 500, "update failed")
			return
		}
		writeJSON(w, 200, map[string]string{"status": "updated"})

	case http.MethodDelete:
		_, err := db.Exec("DELETE FROM tasks WHERE id = ?", id)
		if err != nil {
			writeError(w, 500, "delete failed")
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------- CHECKLISTS ----------

func handleChecklists(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	switch r.Method {

	case http.MethodGet:
		userID := r.Context().Value("userID").(int)

		rows, err := db.Query(
			"SELECT id, title, created_at FROM checklists WHERE user_id = ? ORDER BY id",
			userID,
		)
		if err != nil {
			writeError(w, 500, "db error")
			return
		}
		defer rows.Close()

		lists := []Checklist{}

		for rows.Next() {
			var c Checklist
			rows.Scan(&c.ID, &c.Title, &c.CreatedAt)
			lists = append(lists, c)
		}

		writeJSON(w, 200, lists)

	case http.MethodPost:
		var input struct {
			Title string `json:"title"`
		}

		json.NewDecoder(r.Body).Decode(&input)

		if strings.TrimSpace(input.Title) == "" {
			writeError(w, 400, "title required")
			return
		}

		userID := r.Context().Value("userID").(int)

		result, _ := db.Exec(
			"INSERT INTO checklists (title, user_id) VALUES (?, ?)",
			input.Title,
			userID,
		)

		id, _ := result.LastInsertId()

		writeJSON(w, 201, Checklist{
			ID:    int(id),
			Title: input.Title,
		})

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------- CHECKLIST BY ID ----------

func handleChecklistByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	id, err := parseID(r.URL.Path, "/checklists/")
	if err != nil {
		writeError(w, 400, "invalid id")
		return
	}

	switch r.Method {

	case http.MethodPut:
		var input struct {
			Title string `json:"title"`
		}

		json.NewDecoder(r.Body).Decode(&input)

		_, err := db.Exec("UPDATE checklists SET title = ? WHERE id = ?", input.Title, id)
		if err != nil {
			writeError(w, 500, "update failed")
			return
		}

		writeJSON(w, 200, map[string]string{"status": "updated"})

	case http.MethodDelete:
		_, err := db.Exec("DELETE FROM checklists WHERE id = ?", id)
		if err != nil {
			writeError(w, 500, "delete failed")
			return
		}

		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------- REMINDERS ----------

func handleReminders(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	switch r.Method {

	case http.MethodGet:

		userID := r.Context().Value("userID").(int)
		rows, _ := db.Query("SELECT id, text, remind_at FROM reminders WHERE user_id = ? ORDER BY remind_at", userID)

		reminders := []Reminder{}

		for rows.Next() {
			var rm Reminder
			rows.Scan(&rm.ID, &rm.Text, &rm.RemindAt)
			reminders = append(reminders, rm)
		}

		writeJSON(w, 200, reminders)

	case http.MethodPost:
		var input struct {
			Text     string `json:"text"`
			RemindAt string `json:"remind_at"`
		}

		json.NewDecoder(r.Body).Decode(&input)
		userID := r.Context().Value("userID").(int)

		result, _ := db.Exec(
			"INSERT INTO reminders (text, remind_at, user_id) VALUES (?, ?, ?)",
			input.Text,
			input.RemindAt,
			userID,
		)

		id, _ := result.LastInsertId()

		writeJSON(w, 201, map[string]int{"id": int(id)})

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------- REMINDER BY ID ----------
func handleReminderByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	id, err := parseID(r.URL.Path, "/reminders/")
	if err != nil {
		writeError(w, 400, "invalid id")
		return
	}

	switch r.Method {
	case http.MethodDelete:
		_, err := db.Exec("DELETE FROM reminders WHERE id = ?", id)
		if err != nil {
			writeError(w, 500, "delete failed")
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------signup handler ---------

func handleSignup(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	fmt.Println("Signup API hit")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		writeError(w, 405, "method not allowed")
		return
	}

	var input struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Password  string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, 400, "invalid json format")
		return
	}
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(input.Password),
		bcrypt.DefaultCost,
	)

	if err != nil {
		writeError(w, 500, "failed to hash password")
		return
	}

	input.FirstName = strings.TrimSpace(input.FirstName)
	input.LastName = strings.TrimSpace(input.LastName)
	input.Email = strings.TrimSpace(input.Email)

	if input.FirstName == "" || input.LastName == "" || input.Email == "" || input.Password == "" {
		writeError(w, 400, "first name, last name, email, and password are required")
		return
	}

	if !passwordMatchesStandard(input.Password) {
		writeError(w, 400, "password must be at least 8 characters and include uppercase, lowercase, number, and special character")
		return
	}

	var exists int
	err = db.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", input.Email).Scan(&exists)
	if err != nil {
		writeError(w, 500, "database error")
		return
	}
	if exists > 0 {
		writeError(w, 400, "email already registered")
		return
	}

	result, err := db.Exec(
		"INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)",
		input.FirstName,
		input.LastName,
		input.Email,
		string(hashedPassword),
	)
	if err != nil {
		writeError(w, 500, "user creation failed")
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		writeError(w, 500, "failed to get user id")
		return
	}

	authResponse, err := buildAuthResponse(int(id), input.FirstName, input.LastName, input.Email)
	if err != nil {
		writeError(w, 500, "token creation failed")
		return
	}

	writeJSON(w, 201, authResponse)
}

// ---------login handler ---------
func handleLogin(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		writeError(w, 405, "method not allowed")
		return
	}
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		writeError(w, 400, "invalid json")
		return
	}
	var userID int
	var firstName string
	var lastName string
	var storedPassword string

	err = db.QueryRow(
		"SELECT id, first_name, last_name, password_hash FROM users WHERE email = ?",
		input.Email,
	).Scan(&userID, &firstName, &lastName, &storedPassword)
	if err == sql.ErrNoRows {
		writeError(w, 401, "invalid email or password")
		return
	}
	err = bcrypt.CompareHashAndPassword(
		[]byte(storedPassword),
		[]byte(input.Password),
	)

	if err != nil {
		writeError(w, 401, "invalid email or password")
		return
	}

	authResponse, err := buildAuthResponse(userID, firstName, lastName, input.Email)
	if err != nil {
		writeError(w, 500, "token creation failed")
		return
	}

	writeJSON(w, 200, authResponse)
}

// ---------- MAIN ----------

func main() {
	var err error

	db, err = sql.Open("sqlite3", "tasks.db")
	if err != nil {
		panic(err)
	}

	if err := ensureUsersSchema(); err != nil {
		panic(err)
	}

	http.HandleFunc("/tasks", AuthMiddleware(handleTasks))
	http.HandleFunc("/tasks/", AuthMiddleware(handleTaskByID))

	http.HandleFunc("/checklists", AuthMiddleware(handleChecklists))
	http.HandleFunc("/checklists/", AuthMiddleware(handleChecklistByID))

	http.HandleFunc("/reminders", AuthMiddleware(handleReminders))
	http.HandleFunc("/reminders/", AuthMiddleware(handleReminderByID))
	http.HandleFunc("/signup", handleSignup)
	http.HandleFunc("/login", handleLogin)

	fmt.Println("Server running on http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
