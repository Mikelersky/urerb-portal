# MMSU URERB Portal (University Research Ethics Review Board)

An institutional research ethics review and protocol lifecycle management portal developed for **Mariano Marcos State University (MMSU)** in compliance with Philippine Health Research Ethics Board (PHREB) standards.

---

## 🏛️ System Overview

The **URERB Portal** automates and digitizes the entire research ethics review workflow across three distinct institutional roles:

1. **Researcher (Principal Investigator & Co-Investigators)**
   - Draft and submit protocol applications (Forms 12 to 17, endorsements, data collection tools, and cashier official payment receipt).
   - Real-time interactive submission tracking across SOP lifecycle stages.
   - Respond to Secretariat completeness clarificatory notices with targeted re-uploads.
   - Monitor review deliberations and retrieve ethics clearance certificates.

2. **Secretariat (Intake & Administrative Desk)**
   - Intake verification and completeness checking of mandatory protocol forms.
   - Interactive deficiency notices with granular per-document feedback dispatched to researchers.
   - Review panel coordination: assigning Primary Reviewers, setting deliberation dockets, and establishing 14-day review windows.
   - Formal generation and issuance of official MMSU Ethics Clearance Certificates.
   - Records & Archives management with search, status filtering, and PDF reporting.

3. **Reviewer (Scientific & Ethical Evaluators)**
   - Secure Review Workspace with integrated bilingual document inspection (English & Ilokano).
   - Conflict of Interest (COI) verification & recusals.
   - Evaluation rubrics aligned with PHREB criteria (methodology, risk/benefit ratio, participant vulnerability, consent clarity).
   - Formal decision recommendation (Approve, Minor/Major Modifications, Disapprove).

---

## 💻 Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router v7, Lucide Icons
- **Backend API:** PHP 8+ (PDO, Strict Typing, Session-based authentication)
- **Database:** MySQL / MariaDB (InnoDB, `utf8mb4_unicode_ci`)
- **Server Environment:** Apache (XAMPP) with proxy integration for development

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher) & **npm**
- **XAMPP** (or Apache + MySQL / MariaDB + PHP 8+)
- **Git**

---

### 2. Database Setup (MySQL)
1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open **phpMyAdmin** (`http://localhost/phpmyadmin`) or MySQL CLI.
3. Import the database schema from:
   ```text
   database/urerb_db.sql
   ```
   *This initializes the `urerb_db` database with 10 tables and the default administrative accounts.*

---

### 3. Backend Setup (XAMPP Apache)
Copy or link the `api` folder into your XAMPP `htdocs` directory:
```bash
# Destination path:
C:\xampp\htdocs\urerb-api\
```
Ensure `C:\xampp\htdocs\urerb-api\uploads\` is writable by the web server.

---

### 4. Frontend Setup
1. Clone the repository and navigate into the project directory:
   ```bash
   git clone https://github.com/Mikelersky/urerb-portal.git
   cd urerb-portal
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the portal at `http://localhost:5173`.

---

## 📂 Project Directory Structure

```text
urerb-portal/
├── api/                       # PHP PDO Backend Endpoints & Helpers
│   ├── config/                # Database PDO configuration
│   ├── helpers/               # Formatters, session auth, validation
│   ├── uploads/               # Uploaded protocol vault (.htaccess protected)
│   ├── auth.php               # Login, register, me, logout
│   ├── checking.php           # Secretariat intake checking & deficiency notices
│   ├── processing.php         # Reviewer assignment, docket, clearance
│   ├── protocols.php          # Researcher submissions, drafts, file uploads
│   ├── reviews.php            # Reviewer assignments, evaluations & findings
│   └── archives.php           # Records and archival management
├── database/
│   └── urerb_db.sql           # Complete schema and initialization SQL
├── public/                    # Static assets, logos, and seal images
├── src/
│   ├── components/            # Reusable UI components & modals
│   ├── constants/             # Routes and role constants
│   ├── layouts/               # Researcher, Secretariat, and Reviewer layouts
│   ├── pages/
│   │   ├── auth/              # Login, Register, Forgot Password
│   │   ├── researcher/        # Dashboard, Submissions, Tracking, Profile
│   │   ├── secretariat/       # Dashboard, Checking, Processing, Archives
│   │   └── reviewer/          # Dashboard, Assigned, Workspace, History
│   ├── routes/                # Protected role-based routing
│   ├── services/              # Frontend API client
│   └── utils/                 # Session and authentication utilities
├── package.json
├── vite.config.js
└── README.md
```

---

## 🔐 Default Access Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Secretariat Admin** | `secretariat@mmsu.edu.ph` | `Urerb@2025!` |

*Researchers can register new accounts directly from the portal interface using their MMSU institutional email (`@mmsu.edu.ph`).*

---

## 📜 License
Developed for Mariano Marcos State University (MMSU) — University Research Ethics Review Board.
