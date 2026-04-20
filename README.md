# Mini Todo

A full-stack todo app with:

- `frontend`: React + TypeScript + Vite
- `backend`: Go + PostgreSQL
- JWT-based login/signup
- Per-user checklists, tasks, and reminders

## Project Structure

```text
mini-todo/
├── backend/
│   ├── go.mod
│   └── main.go
├── frontend/
│   ├── package.json
│   └── src/
└── README.md
```

## Requirements

- Node.js 18+
- npm
- Go 1.25+
- PostgreSQL 14+

## Database Setup

Create a PostgreSQL database for the app:

```bash
createdb mini_todo
```

The backend reads the database connection from `DATABASE_URL`.

Example:

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/mini_todo?sslmode=disable"
```

If `DATABASE_URL` is not set, the backend uses this default:

```text
postgres://postgres:postgres@localhost:5432/mini_todo?sslmode=disable
```

Make sure:

- PostgreSQL is running
- the database exists
- the username/password in the URL match your local PostgreSQL setup

## Backend Setup

From the repo root:

```bash
cd backend
go mod tidy
go run .
```

The backend runs on:

```text
http://localhost:8080
```

On startup it automatically creates these tables if they do not exist:

- `users`
- `checklists`
- `tasks`
- `reminders`

## Frontend Setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## How Login Works

1. A user signs up or logs in from the frontend.
2. The frontend sends the request to the Go backend.
3. The backend checks the user in PostgreSQL.
4. On success, the backend returns:
   - a JWT token
   - the logged-in user object
5. The frontend stores that auth session in browser storage.
6. Future requests send the token in the `Authorization` header.
7. The backend uses that token to identify the current user and only return that user's data.

## User Data Isolation

This app is set up so each user has their own data:

- each checklist belongs to one user
- each reminder belongs to one user
- tasks belong to checklists, and checklists belong to users
- protected routes use the JWT token to determine the current user
- update/delete routes check ownership before changing data

## Useful Commands

Backend:

```bash
cd backend
go build ./...
go run .
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting

If login says it cannot reach the server:

- make sure the backend is running on `http://localhost:8080`
- make sure PostgreSQL is running
- make sure `DATABASE_URL` points to a real database

If the backend fails to start:

- verify PostgreSQL credentials
- verify the `mini_todo` database exists
- run `go mod tidy` inside `backend`

If the frontend fails to load dependencies:

- run `npm install` inside `frontend`

