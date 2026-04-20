package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"unicode"

	"context"
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"
	"time"
)

var db *sql.DB
var jwtSecret []byte
var allowedOrigins map[string]struct{}

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

func parseAllowedOrigins(raw string) map[string]struct{} {
	origins := map[string]struct{}{}
	for _, value := range strings.Split(raw, ",") {
		origin := strings.TrimSpace(value)
		if origin != "" {
			origins[origin] = struct{}{}
		}
	}
	return origins
}

func isOriginAllowed(origin string) bool {
	if len(allowedOrigins) == 0 {
		return false
	}

	if _, ok := allowedOrigins["*"]; ok {
		return true
	}

	_, ok := allowedOrigins[origin]
	return ok
}

func enableCORS(w http.ResponseWriter, r *http.Request) {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin != "" && isOriginAllowed(origin) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
	}
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

func ensureSchema() error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			first_name TEXT NOT NULL DEFAULT '',
			last_name TEXT NOT NULL DEFAULT '',
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL
		)
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		ALTER TABLE users
		ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
		ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT ''
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS checklists (
			id BIGSERIAL PRIMARY KEY,
			title TEXT NOT NULL,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS tasks (
			id BIGSERIAL PRIMARY KEY,
			text TEXT NOT NULL,
			done BOOLEAN NOT NULL DEFAULT FALSE,
			checklist_id BIGINT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS reminders (
			id BIGSERIAL PRIMARY KEY,
			text TEXT NOT NULL,
			remind_at TIMESTAMPTZ NOT NULL,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_checklists_user_id ON checklists(user_id);
		CREATE INDEX IF NOT EXISTS idx_tasks_checklist_id ON tasks(checklist_id);
		CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
	`)
	return err
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

	tokenString, err := token.SignedString(jwtSecret)
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
		return jwtSecret, nil
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
			enableCORS(w, r)
			w.WriteHeader(http.StatusOK)
			return
		}

		userID, err := getUserID(r)
		if err != nil {
			enableCORS(w, r)
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
	enableCORS(w, r)

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
			userID := r.Context().Value("userID").(int)
			rows, err = db.Query(
				`SELECT t.id, t.text, t.done, t.checklist_id
				 FROM tasks t
				 JOIN checklists c ON t.checklist_id = c.id
				 WHERE t.checklist_id = $1 AND c.user_id = $2
				 ORDER BY t.id`,
				checklistID,
				userID,
			)
		} else {
			userID := r.Context().Value("userID").(int)

			rows, err = db.Query(
				`SELECT t.id, t.text, t.done, t.checklist_id
				 FROM tasks t
				 JOIN checklists c ON t.checklist_id = c.id
				 WHERE c.user_id = $1
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
			"SELECT user_id FROM checklists WHERE id = $1",
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

		var taskID int
		err = db.QueryRow(
			"INSERT INTO tasks (text, done, checklist_id) VALUES ($1, $2, $3) RETURNING id",
			input.Text,
			false,
			input.ChecklistID,
		).Scan(&taskID)
		if err != nil {
			writeError(w, 500, "insert failed")
			return
		}

		writeJSON(w, 201, Task{
			ID:          taskID,
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
	enableCORS(w, r)

	id, err := parseID(r.URL.Path, "/tasks/")
	if err != nil {
		writeError(w, 400, "invalid id")
		return
	}

	switch r.Method {

	case http.MethodPut:
		userID := r.Context().Value("userID").(int)
		result, err := db.Exec(
			`UPDATE tasks t
			 SET done = NOT t.done
			 FROM checklists c
			 WHERE t.checklist_id = c.id AND t.id = $1 AND c.user_id = $2`,
			id,
			userID,
		)
		if err != nil {
			writeError(w, 500, "update failed")
			return
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			writeError(w, 404, "task not found")
			return
		}
		writeJSON(w, 200, map[string]string{"status": "updated"})

	case http.MethodDelete:
		userID := r.Context().Value("userID").(int)
		result, err := db.Exec(
			`DELETE FROM tasks t
			 USING checklists c
			 WHERE t.checklist_id = c.id AND t.id = $1 AND c.user_id = $2`,
			id,
			userID,
		)
		if err != nil {
			writeError(w, 500, "delete failed")
			return
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			writeError(w, 404, "task not found")
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------- CHECKLISTS ----------

func handleChecklists(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)

	switch r.Method {

	case http.MethodGet:
		userID := r.Context().Value("userID").(int)

		rows, err := db.Query(
			"SELECT id, title, created_at FROM checklists WHERE user_id = $1 ORDER BY id",
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

		var checklist Checklist
		err := db.QueryRow(
			`INSERT INTO checklists (title, user_id)
			 VALUES ($1, $2)
			 RETURNING id, title, created_at`,
			input.Title,
			userID,
		).Scan(&checklist.ID, &checklist.Title, &checklist.CreatedAt)
		if err != nil {
			writeError(w, 500, "insert failed")
			return
		}

		writeJSON(w, 201, checklist)

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------- CHECKLIST BY ID ----------

func handleChecklistByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)

	id, err := parseID(r.URL.Path, "/checklists/")
	if err != nil {
		writeError(w, 400, "invalid id")
		return
	}

	switch r.Method {

	case http.MethodPut:
		userID := r.Context().Value("userID").(int)
		var input struct {
			Title string `json:"title"`
		}

		json.NewDecoder(r.Body).Decode(&input)

		var checklist Checklist
		err := db.QueryRow(
			`UPDATE checklists
			 SET title = $1
			 WHERE id = $2 AND user_id = $3
			 RETURNING id, title, created_at`,
			input.Title,
			id,
			userID,
		).Scan(&checklist.ID, &checklist.Title, &checklist.CreatedAt)
		if err == sql.ErrNoRows {
			writeError(w, 404, "checklist not found")
			return
		}
		if err != nil {
			writeError(w, 500, "update failed")
			return
		}

		writeJSON(w, 200, checklist)

	case http.MethodDelete:
		userID := r.Context().Value("userID").(int)
		result, err := db.Exec("DELETE FROM checklists WHERE id = $1 AND user_id = $2", id, userID)
		if err != nil {
			writeError(w, 500, "delete failed")
			return
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			writeError(w, 404, "checklist not found")
			return
		}

		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------- REMINDERS ----------

func handleReminders(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)

	switch r.Method {

	case http.MethodGet:

		userID := r.Context().Value("userID").(int)
		rows, err := db.Query(
			"SELECT id, text, remind_at FROM reminders WHERE user_id = $1 ORDER BY remind_at",
			userID,
		)
		if err != nil {
			writeError(w, 500, "db error")
			return
		}
		defer rows.Close()

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

		var reminderID int
		err := db.QueryRow(
			"INSERT INTO reminders (text, remind_at, user_id) VALUES ($1, $2, $3) RETURNING id",
			input.Text,
			input.RemindAt,
			userID,
		).Scan(&reminderID)
		if err != nil {
			writeError(w, 500, "insert failed")
			return
		}

		writeJSON(w, 201, map[string]int{"id": reminderID})

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------- REMINDER BY ID ----------
func handleReminderByID(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)

	id, err := parseID(r.URL.Path, "/reminders/")
	if err != nil {
		writeError(w, 400, "invalid id")
		return
	}

	switch r.Method {
	case http.MethodDelete:
		userID := r.Context().Value("userID").(int)
		result, err := db.Exec("DELETE FROM reminders WHERE id = $1 AND user_id = $2", id, userID)
		if err != nil {
			writeError(w, 500, "delete failed")
			return
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			writeError(w, 404, "reminder not found")
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeError(w, 405, "method not allowed")
	}
}

// ---------signup handler ---------

func handleSignup(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
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
	err = db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", input.Email).Scan(&exists)
	if err != nil {
		writeError(w, 500, "database error")
		return
	}
	if exists > 0 {
		writeError(w, 400, "email already registered")
		return
	}

	var id int
	err = db.QueryRow(
		`INSERT INTO users (first_name, last_name, email, password_hash)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id`,
		input.FirstName,
		input.LastName,
		input.Email,
		string(hashedPassword),
	).Scan(&id)
	if err != nil {
		writeError(w, 500, "user creation failed")
		return
	}

	authResponse, err := buildAuthResponse(id, input.FirstName, input.LastName, input.Email)
	if err != nil {
		writeError(w, 500, "token creation failed")
		return
	}

	writeJSON(w, 201, authResponse)
}

// ---------login handler ---------
func handleLogin(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)

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
		"SELECT id, first_name, last_name, password_hash FROM users WHERE email = $1",
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

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgres@localhost:5432/mini_todo?sslmode=disable"
	}

	db, err = sql.Open("pgx", databaseURL)
	if err != nil {
		panic(err)
	}

	if err := db.Ping(); err != nil {
		panic(err)
	}

	if err := ensureSchema(); err != nil {
		panic(err)
	}

	jwtSecret = []byte(strings.TrimSpace(os.Getenv("JWT_SECRET")))
	if len(jwtSecret) == 0 {
		panic("JWT_SECRET must be set")
	}

	allowedOrigins = parseAllowedOrigins(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if len(allowedOrigins) == 0 {
		frontendURL := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
		if frontendURL != "" {
			if parsed, parseErr := url.Parse(frontendURL); parseErr == nil && parsed.Scheme != "" && parsed.Host != "" {
				allowedOrigins[fmt.Sprintf("%s://%s", parsed.Scheme, parsed.Host)] = struct{}{}
			}
		}
	}

	if len(allowedOrigins) == 0 {
		allowedOrigins["http://localhost:5173"] = struct{}{}
	}

	http.HandleFunc("/tasks", AuthMiddleware(handleTasks))
	http.HandleFunc("/tasks/", AuthMiddleware(handleTaskByID))

	http.HandleFunc("/checklists", AuthMiddleware(handleChecklists))
	http.HandleFunc("/checklists/", AuthMiddleware(handleChecklistByID))

	http.HandleFunc("/reminders", AuthMiddleware(handleReminders))
	http.HandleFunc("/reminders/", AuthMiddleware(handleReminderByID))
	http.HandleFunc("/signup", handleSignup)
	http.HandleFunc("/login", handleLogin)
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r)
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server running on http://localhost:%s using %s\n", port, databaseURL)
	http.ListenAndServe(":"+port, nil)
}
