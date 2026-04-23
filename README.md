# Daily Work Diary Management System
### Optimized Solution

A complete web application for managing daily work entries with separate Employee and Admin portals.

---

## 📁 Project Structure

```
daily-work-diary/
├── backend/
│   ├── routes/
│   │   ├── auth.js         # Login & user routes
│   │   ├── entries.js      # CRUD entry routes
│   │   └── export.js       # PDF export route
│   ├── database.js         # SQLite (sql.js) setup & helpers
│   ├── server.js           # Express server
│   ├── package.json
│   └── diary.db            # Created automatically on first run
├── frontend/
│   ├── index.html          # Main HTML (all pages)
│   ├── style.css           # Complete stylesheet
│   └── app.js              # Frontend JavaScript
└── README.md
```

---

## 🚀 Setup & Run

### Prerequisites
- Node.js v14 or higher
- npm

### Steps

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Start the server**
   ```bash
   node server.js
   ```
   
   Or with auto-reload:
   ```bash
   npm run dev
   ```

3. **Open the app**
   ```
   http://localhost:3000
   ```

---

## 👤 Default Login Credentials

| Role     | Name           | Password   |
|----------|----------------|------------|
| Admin    | Admin          | admin123   |
| Employee | Keyur Makadia  | keyur123   |
| Employee | Rahul Sharma   | rahul123   |
| Employee | Priya Patel    | priya123   |
| Employee | Amit Shah      | amit123    |
| Employee | Neha Joshi     | neha123    |

---

## 🗄️ Database Schema

### USERS table
| Column     | Type    | Description                    |
|------------|---------|--------------------------------|
| id         | INTEGER | Primary key, auto-increment    |
| name       | TEXT    | Full name                      |
| role       | TEXT    | 'admin' or 'user'              |
| password   | TEXT    | Plain text (hash in production)|
| created_at | TEXT    | Timestamp                      |

### ENTRIES table
| Column         | Type    | Description                    |
|----------------|---------|--------------------------------|
| id             | INTEGER | Primary key, auto-increment    |
| user_id        | INTEGER | Foreign key → users.id         |
| date           | TEXT    | Entry date (YYYY-MM-DD)        |
| project_name   | TEXT    | Project name                   |
| task_name      | TEXT    | Task name                      |
| description    | TEXT    | Task description               |
| hours_assigned | REAL    | Hours assigned                 |
| hours_spent    | REAL    | Hours actually spent           |
| status         | TEXT    | 'Pending' or 'Completed'       |
| remarks        | TEXT    | Additional notes               |
| created_at     | TEXT    | Timestamp (used for 5-day rule)|

---

## 🔌 API Reference

| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| POST   | /api/auth/login           | Login (admin or user)    |
| GET    | /api/auth/users           | Get all employee names   |
| POST   | /api/entries              | Add new entry            |
| GET    | /api/entries/user/:id     | Get user entries (5 days)|
| GET    | /api/entries/admin        | Get all entries (admin)  |
| PUT    | /api/entries/:id          | Update entry             |
| DELETE | /api/entries/:id          | Delete entry             |
| GET    | /api/export/pdf           | Export PDF report        |

---

## ⚙️ Key Features

- **5-Day Edit Window**: Entries older than 5 days are hidden from employees and cannot be edited/deleted
- **Restricted Edit Fields**: During editing, only Hours Spent, Status, and Remarks are editable
- **Smart Hour Logic**: When hours spent on one task exceeds another task's assigned hours, the latter is automatically zeroed out
- **Name Restriction**: Employees can only submit entries under their own name
- **PDF Export**: Admin can export filtered data as a professional PDF with the Optimized Solution branding

---

## 🎨 Design Theme

- **Primary**: Blue `#294674`
- **Accent**: Red `#C93731`  
- **Neutral**: Grey `#727371`
- **Font**: IBM Plex Sans
