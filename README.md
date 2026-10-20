# IT Incident Management and Resolution System

An enterprise-grade, full-stack IT service desk and incident resolution platform built with **Java 21 LTS**, **Spring Boot 3.3.5**, **MySQL 8.0**, **React 19**, **TypeScript**, and **Vite**, complete with an automated DevOps and quality assurance pipeline (**Jenkins**, **SonarQube**, and **Docker Compose**).

---

## 1. Project Overview

The **IT Incident Management and Resolution System** enables organizations to log, categorize, prioritize, triage, and resolve IT operational incidents while enforcing strict Service Level Agreements (SLAs), role-based security, and end-to-end auditability.

### Key Capabilities
- **Incident Lifecycle Management:** Status progression (`NEW` -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`).
- **ITIL Priority Matrix:** Priority calculation (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with SLA tracking.
- **Role-Based Access Control (RBAC):** Distinct roles for `ROLE_ADMIN`, `ROLE_AGENT`, and `ROLE_USER`.
- **Complete Audit Trail:** Historic changelog recording all modifications, assignments, and resolution notes.
- **Automated DevOps Quality Pipeline:** Integrated JUnit 5 unit tests, Mockito mocks, Selenium WebDriver E2E tests, Jenkins CI, and SonarQube quality gates.

---

## 2. Technology Stack & Verified Versions

| Tier / Component | Technology | Version | Location / Port |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Eclipse Adoptium OpenJDK | `21.0.12.1 LTS` | `JAVA_HOME` configured |
| **Backend Framework** | Spring Boot | `3.3.5` | `backend/` (Port: `8080`) |
| **Backend Build Tool** | Apache Maven | `3.9.14` | Maven CLI |
| **Frontend Runtime** | Node.js / npm | `v24.14.0` / `11.9.0` | Node CLI |
| **Frontend Framework** | React + TypeScript + Vite | `19.2.8` / `6.0.2` / `8.3.4` | `frontend/` (Port: `5180`) |
| **Styling** | Modern Vanilla CSS Design Tokens | Enterprise Dark System | `frontend/src/index.css` |
| **Database** | MySQL Server (Windows Service) | `8.0.45` | Port: `3306` |
| **Database Migrations** | Flyway | `10.15.2` (Spring Boot 3.3.5) | `backend/src/main/resources/db/migration/` |
| **CI Automation** | Jenkins | `2.541.3` | Port: `8090` |
| **Static Code Analysis** | SonarQube Community Edition | `10.7` | `docker-compose.yml` (Port: `9000`) |
| **Automated Testing** | JUnit 5, Mockito, Selenium | `5.10.3`, `5.11.0`, `4.25.0` | `backend/src/test/` |

---

## 3. Directory Layout

```text
D:\IT Incident Management and Resolution System\
│
├── .gitignore                          # Git exclusions (target/, node_modules/, .env, etc.)
├── .env.example                        # Environment variables template
├── docker-compose.yml                  # SonarQube & PostgreSQL orchestration (Port 9000)
├── README.md                           # Master system documentation
│
├── docs/                               # Architecture and setup documentation
│   ├── ENVIRONMENT_ASSESSMENT.md       # Pre-flight environment evaluation
│   ├── ARCHITECTURE.md                 # System architecture & DevOps pipeline
│   ├── DATABASE_DESIGN.md              # Database schemas, ER diagram, and migrations
│   └── SETUP_GUIDE.md                  # Developer environment setup instructions
│
├── backend/                            # Spring Boot 3 + Java 21 REST API
│   ├── pom.xml                         # Maven build configuration
│   └── src/
│       ├── main/
│       │   ├── java/com/incident/system/
│       │   │   ├── config/             # Security & CORS configuration
│       │   │   ├── controller/         # REST API endpoints
│       │   │   └── IncidentManagementApplication.java
│       │   └── resources/
│       │       ├── application.yml     # Application configuration
│       │       ├── application-dev.yml # Local dev profile (MySQL 8.0)
│       │       └── db/migration/       # Flyway SQL migrations (V1__initial_schema.sql)
│       └── test/                       # JUnit 5, Mockito, and Selenium test suites
│
└── frontend/                           # React 19 + TypeScript + Vite SPA
    ├── package.json                    # Dependencies & build scripts
    ├── tsconfig.json                   # TypeScript compiler configuration
    ├── vite.config.ts                  # Vite bundler & backend API proxy
    ├── index.html                      # HTML5 entrypoint with Google Fonts
    └── src/
        ├── index.css                   # Core enterprise design system CSS
        ├── App.tsx                     # Main layout & live health dashboard
        └── App.css                     # Responsive styling & components
```

---

## 4. Quick Start & Verification

### 4.1 Prerequisites
- Ensure `JAVA_HOME` is set to JDK 21 (`C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot`).
- Host MySQL 8.0 is running on port `3306`.
- Create a copy of `.env.example` named `.env` and fill in your local MySQL root password.

### 4.2 Running the Backend
```powershell
cd "D:\IT Incident Management and Resolution System\backend"
mvn clean test
mvn spring-boot:run
```
*Health Check:* Open [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)

### 4.3 Running the Frontend
```powershell
cd "D:\IT Incident Management and Resolution System\frontend"
npm install
npm run dev
```
*Web UI:* Open [http://localhost:5180](http://localhost:5180)

---

## 5. Security Notice
Never commit `.env` files or hard-code credentials. All sensitive parameters are resolved through environment variables at runtime.
