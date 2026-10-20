# Environment and Workspace Assessment Report
**Project:** IT Incident Management and Resolution System  
**Assessment Date:** 2026-10-16  
**Workspace Path:** `D:\IT Incident Management and Resolution System`  
**Host Operating System:** Microsoft Windows 11 (amd64)

---

## 1. Executive Summary

An environment and pre-flight workspace assessment was conducted for the **IT Incident Management and Resolution System** project. 

The workspace `D:\IT Incident Management and Resolution System` is confirmed active and completely empty (0 files, 0 directories, clean slate). Most core developer runtimes—**Java JDK 21 LTS**, **Apache Maven 3.9.14**, **Node.js v24.14.0 / npm 11.9.0**, **Git 2.53.0**, **MySQL 8.0.45**, and **Jenkins 2.541.3**—are installed and functioning on the host machine. 

Key environment factors and configuration items identified include:
1. **Docker Desktop** is installed (Docker CLI 29.2.1, Compose v5.0.2), but the **Docker daemon is currently stopped**.
2. **Jenkins** is actively running as a Windows Service on **port 8090** (leaving the default Spring Boot port **8080 completely free**).
3. **MySQL Server 8.0** is actively running as a Windows Service (`MySQL80`) on port **3306**.
4. **SonarQube** is not installed as a host-level Windows service or standalone CLI; it is best provisioned via **Docker Compose** on port 9000.
5. `JAVA_HOME` is **not set** in system/user environment variables, which should be configured to ensure seamless build tool execution.
6. Git global user credentials (`user.name` and `user.email`) are currently unset.

---

## 2. Workspace Verification & Baseline Inspection

- **Target Workspace:** `D:\IT Incident Management and Resolution System`
- **Active Working Directory Verification:** Verified using PowerShell `Get-Location` and directory listing.
- **Existing File Inspection:**
  - Standard items: 0
  - Hidden items: 0
  - Git repository: None initialized (`.git` directory absent)
  - Data integrity: No existing project files, user documents, or legacy code present. Clean workspace ready for structured project scaffolding.

---

## 3. Toolchain & Service Status Matrix

Each tool was directly tested through PowerShell verification commands. The table below distinguishes installed CLI/runtime software from actively running background services:

| Component | Target Role in Stack | Installed? | Exact Version / Location | Service / Process Status | Port Status | Verification Command | Usable Now? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Java JDK** | Backend Runtime & Compiler | **Yes** | OpenJDK 21.0.12.1 LTS (`Eclipse Adoptium Temurin-21.0.12.1+1`) at `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` | Process PID 7948 (Jenkins child) | N/A | `java -version`, `javac -version` | **Yes** (set `JAVA_HOME`) |
| **Apache Maven** | Backend Build & Dependency Mgr | **Yes** | Apache Maven 3.9.14 at `C:\Program Files\Maven\apache-maven-3.9.14` | CLI utility | N/A | `mvn -version` | **Yes** |
| **Node.js** | Frontend Runtime | **Yes** | v24.14.0 at `C:\Program Files\nodejs\node.exe` | CLI runtime | N/A | `node -v` | **Yes** |
| **npm** | Frontend Package Manager | **Yes** | 11.9.0 at `C:\Program Files\nodejs\npm.ps1` | CLI utility | N/A | `npm -v` | **Yes** |
| **Git** | Version Control | **Yes** | 2.53.0.windows.2 at `C:\Program Files\Git\cmd\git.exe` | CLI utility | N/A | `git --version` | **Yes** (needs user info) |
| **Docker Engine & CLI** | Containerization | **Yes** | Docker CLI 29.2.1 at `C:\Program Files\Docker\Docker\resources\bin\docker.exe` | **Stopped** (`com.docker.service` stopped; daemon pipe unavailable) | N/A | `docker --version`, `docker info` | **No** (start Docker Desktop) |
| **Docker Compose** | Multi-container Orchestration | **Yes** | Docker Compose v5.0.2 plugin at `C:\Program Files\Docker\cli-plugins\docker-compose.exe` | Depends on Docker Daemon | N/A | `docker compose version` | **No** (waiting on daemon) |
| **MySQL Server** | Relational Database | **Yes** | MySQL Community Server 8.0.45 (`C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`) | **Running** (Windows Service `MySQL80`, PID 7244) | **3306** (TCP Listen verified) | `mysql --version`, `Get-Service MySQL80`, `Test-NetConnection 127.0.0.1:3306` | **Yes** |
| **Jenkins** | CI/CD Automation Server | **Yes** | Jenkins 2.541.3 (`C:\Program Files\Jenkins\jenkins.war`) | **Running** (Windows Service `Jenkins`, PID 6128 wrapper, PID 7948 Java) | **8090** (HTTP 200 response on `/login`) | `Get-Service Jenkins`, `Invoke-WebRequest http://localhost:8090/login` | **Yes** |
| **SonarQube** | Static Code Analysis | **No (Host)** | Not found in host PATH, Services, or standard directories | Not Running on Host | **9000 (Free)** | `Get-Service *sonar*`, directory scan | **To be provisioned** (Docker Compose) |
| **Browsers (Selenium)** | End-to-End Testing | **Yes** | Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`), Microsoft Edge | Installed Desktop App | N/A | Registry check `HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths` | **Yes** (via Selenium Manager) |

---

## 4. Port Availability and Network Analysis

Network listener sockets were inspected using PowerShell `Get-NetTCPConnection` across all project-critical ports:

| Port | Standard Usage | Status | Current Process / Application | Notes & Potential Conflicts |
| :---: | :--- | :---: | :--- | :--- |
| **3000** | Alternative UI Port | **FREE** | None | Available for development servers if needed |
| **3306** | MySQL Database | **OCCUPIED** | PID: 7244 (`mysqld.exe`) | Host MySQL server is actively bound. If Docker MySQL is used, port mapping must be adjusted (e.g. `3307:3306`) or host service stopped. |
| **5173** | Vite Dev Server | **FREE** | None | **Available** for React + TypeScript frontend dev server |
| **8080** | Spring Boot Backend | **FREE** | None | **Available** for Spring Boot REST API (Jenkins does not conflict) |
| **8081** | Backup Backend Port | **FREE** | None | Available |
| **8082** | Backup Backend Port | **FREE** | None | Available |
| **8090** | Jenkins Web UI | **OCCUPIED** | PID: 7948 (`java.exe` / Jenkins) | Jenkins runs cleanly on 8090, avoiding default 8080 clash |
| **9000** | SonarQube Server | **FREE** | None | **Available** for SonarQube container orchestration |
| **50000** | Jenkins Inbound Agent | **FREE** | None | Available for Jenkins build agents |

---

## 5. Identified Configuration Issues, Gaps & Prerequisites

### 5.1 Configuration Issues
1. **`JAVA_HOME` Missing:**
   - Neither Machine nor User environment variables contain `JAVA_HOME`.
   - While Maven can discover Java through PATH, certain build plugins, test frameworks, and child processes strictly require `%JAVA_HOME%` to point to the JDK root:
     `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot`
2. **Git Global User Unset:**
   - Git commit operations will require an author identity (`user.name` and `user.email`).
3. **Docker Desktop Daemon Inactive:**
   - The CLI binaries (`docker.exe`, `docker-compose.exe`) are functional, but the engine is not running (`open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`).
   - Starting Docker Desktop will enable container-based workflows for SonarQube and pipeline testing.

### 5.2 Dependency & Tool Gaps
1. **SonarQube Instance:**
   - SonarQube is not installed on the Windows host.
   - **Recommended resolution:** Rather than installing SonarQube directly onto Windows with required Elasticsearch dependencies and JDK tuning, deploy SonarQube Community Edition via `docker-compose.yml` leveraging port 9000.
2. **Database Scaffolding & Credentials:**
   - MySQL 8.0 is running on port 3306, but a project-specific database (`incident_db`) and service credentials have not yet been provisioned.

---

## 6. Recommended Architecture & Minimum Tech Stack

To satisfy enterprise standards, full-stack separation of concerns, and full DevOps lifecycle capabilities, the recommended setup is:

### 6.1 Frontend Stack
- **Framework:** React 19 / React 18 with TypeScript
- **Tooling & Bundler:** Vite (fast HMR, ES modules, minimal build overhead)
- **Styling:** Modern Vanilla CSS or Tailwind CSS with clean design system tokens (CSS variables, dark/light theme support)
- **State & HTTP:** React Context / Zustand / React Query, Axios for typed REST integration
- **Port:** `5173` (development) / Nginx container (production)

### 6.2 Backend Stack
- **Framework:** Java 21 LTS + Spring Boot 3.3.x / 3.4.x
- **Modules:**
  - `spring-boot-starter-web` (REST APIs)
  - `spring-boot-starter-data-jpa` (Hibernate ORM & Repositories)
  - `spring-boot-starter-validation` (Bean validation for incident payloads)
  - `spring-boot-starter-security` (Role-based access control: Admin, IT Support Agent, Employee/User)
  - `mysql-connector-j` (JDBC Driver)
  - `lombok` (Boilerplate reduction)
- **Port:** `8080` (Spring Boot default, confirmed free)

### 6.3 Database Layer
- **System:** MySQL Community Server 8.0 (Host or Dockerized)
- **Database Name:** `incident_db`
- **Schema Management:** Flyway or Spring JPA auto-DDL (`validate` or `update` in dev)
- **Port:** `3306`

### 6.4 Testing Suite
- **Unit & Integration:** JUnit 5 (Jupiter), Mockito, AssertJ, Spring Boot Test (`@WebMvcTest`, `@DataJpaTest`)
- **End-to-End (E2E):** Selenium WebDriver 4.x (Java) with automated browser driver management via Selenium Manager testing real Chrome/Edge flows against the React UI.

### 6.5 DevOps & CI/CD Pipeline
- **Continuous Integration:** Host Jenkins (port 8090)
  - Pipeline script (`Jenkinsfile` declarative)
  - Stages: Checkout -> Lint & Compile -> Unit Tests (JUnit) -> Static Code Analysis (SonarQube) -> E2E Integration Tests -> Package Docker Images
- **Quality Gate:** SonarQube Community Edition via Docker Compose (port 9000) using Maven `sonar-maven-plugin`
- **Orchestration:** `docker-compose.yml` for local reproducibility and multi-service deployment.

---

## 7. Proposed Project Directory Structure

```text
D:\IT Incident Management and Resolution System\
│
├── .gitignore                          # Global git ignore (node_modules, target, .env, etc.)
├── README.md                           # Master system documentation & setup guide
├── docker-compose.yml                  # Local orchestration (SonarQube, MySQL, containers)
├── Jenkinsfile                         # Declarative CI/CD pipeline definition
│
├── docs/                               # Architectural, design, and assessment documentation
│   ├── ENVIRONMENT_ASSESSMENT.md       # This assessment document
│   ├── ARCHITECTURE.md                 # System design & ER diagrams (to be created)
│   └── API_SPECIFICATION.md            # REST API endpoints & schemas (to be created)
│
├── backend/                            # Spring Boot Application (Maven Multi-Module or Single)
│   ├── pom.xml                         # Maven build configuration
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/incident/system/
│   │   │   │   ├── config/             # Security, CORS, Swagger configs
│   │   │   │   ├── controller/         # REST Controllers
│   │   │   │   ├── dto/                # Request / Response DTOs
│   │   │   │   ├── entity/             # JPA Entities (Incident, User, Department, AuditLog)
│   │   │   │   ├── repository/         # Spring Data JPA Repositories
│   │   │   │   ├── service/            # Business Logic & Service Interfaces
│   │   │   │   └── exception/          # Global Exception Handling
│   │   │   └── resources/
│   │   │       ├── application.yml     # Configuration (DB URL, JPA, Logging)
│   │   │       └── application-dev.yml # Local development profile
│   │   └── test/
│   │       ├── java/com/incident/system/
│   │       │   ├── unit/               # Service & Controller JUnit/Mockito tests
│   │       │   ├── integration/        # JPA & Integration tests
│   │       │   └── e2e/                # Selenium WebDriver UI end-to-end tests
│   │       └── resources/              # Test fixtures & application-test.yml
│   └── Dockerfile                      # Backend container definition
│
└── frontend/                           # React + TypeScript + Vite SPA
    ├── package.json                    # Node dependencies and scripts
    ├── tsconfig.json                   # TypeScript configuration
    ├── vite.config.ts                  # Vite bundler configuration (proxy to :8080)
    ├── index.html                      # HTML5 entrypoint
    ├── src/
    │   ├── assets/                     # Static media & icons
    │   ├── components/                 # Reusable UI components (Navbar, Modals, Tables)
    │   ├── pages/                      # Page views (Dashboard, IncidentList, TicketDetail)
    │   ├── services/                   # Axios API client calls
    │   ├── types/                      # TypeScript interfaces & types
    │   ├── context/                    # Authentication & Theme state
    │   ├── App.tsx                     # Routing & master layout
    │   ├── main.tsx                    # React DOM root entry
    │   └── index.css                   # Core design system & CSS styling
    └── Dockerfile                      # Production build & Nginx hosting container
```

---

## 8. Verification Commands Executed During Assessment

For full auditability, the exact commands used during this assessment are listed below:

1. **Workspace Inspection:**
   ```powershell
   Get-Location
   Get-ChildItem -Force
   ```
2. **Java JDK & Compiler:**
   ```powershell
   java -version
   javac -version
   $env:JAVA_HOME
   ```
3. **Maven:**
   ```powershell
   mvn -version
   $env:M2_HOME; $env:MAVEN_HOME
   ```
4. **Node.js & npm:**
   ```powershell
   node -v
   npm -v
   ```
5. **Git:**
   ```powershell
   git --version
   git config user.name; git config user.email
   ```
6. **Docker Desktop & Compose:**
   ```powershell
   docker --version
   docker compose version
   docker info
   Get-Service *docker*
   ```
7. **MySQL Server:**
   ```powershell
   mysql --version
   Get-Service MySQL80
   Test-NetConnection -ComputerName 127.0.0.1 -Port 3306
   ```
8. **Jenkins:**
   ```powershell
   Get-Service Jenkins
   Get-Process jenkins, java
   Invoke-WebRequest -Uri "http://localhost:8090/login" -UseBasicParsing
   ```
9. **SonarQube & Port Auditing:**
   ```powershell
   Get-Service *sonar*
   Get-NetTCPConnection -State Listen | Where-Object { @(3000, 3306, 5173, 8080, 8081, 8090, 9000, 50000) -contains $_.LocalPort }
   ```
10. **Browsers for Selenium:**
    ```powershell
    (Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe').'(default)'
    (Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe').'(default)'
    ```

---

## 9. Next Actions Requiring User Approval

Per instructions, no system modifications or code generation were executed without authorization. The following specific actions are proposed for approval prior to proceeding with implementation:

1. **Set `JAVA_HOME` Environment Variable:**
   - Set User or System environment variable `JAVA_HOME` to `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot`.
2. **Configure Git Identity (if not already set globally):**
   - Provide preferred user name and email for Git version control commits within this workspace.
3. **Initialize Git Repository in Workspace:**
   - Execute `git init` and create `.gitignore` inside `D:\IT Incident Management and Resolution System`.
4. **Start Docker Desktop:**
   - Launch Docker Desktop on Windows to bring the Docker daemon online for containerized services.
5. **Choose MySQL Strategy:**
   - **Option A (Recommended):** Utilize the running host MySQL 8.0 instance on port 3306 by creating the `incident_db` database and development credentials.
   - **Option B:** Stop the Windows `MySQL80` service and run MySQL entirely through Docker Compose.
6. **Deploy SonarQube Container:**
   - Prepare a Docker Compose definition to bring up SonarQube Community Edition on port 9000 once Docker Desktop is running.
7. **Proceed with Project Scaffolding:**
   - Upon approval, initialize the Spring Boot backend (`backend/`) and Vite React TypeScript frontend (`frontend/`) following the approved directory structure.
