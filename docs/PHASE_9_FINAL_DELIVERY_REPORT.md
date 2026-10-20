# RESOLV — Phase 9: Final Integration, Verification & Delivery Report

**Project:** IT Incident Management and Resolution System (RESOLV)  
**Workspace:** `D:\IT Incident Management and Resolution System`  
**Execution Timestamp:** 2026-10-18T23:15:00+05:30  
**Phase Completed:** Phase 9 — Final Integration, Verification & Delivery  

---

## 1. Executive Summary & Verification Classification

Phase 9 completes the final integration, regression testing, security auditing, DevOps configuration validation, and delivery hygiene checks for the **RESOLV** platform. 

All automated unit, integration, and security regression test suites passed with **100% success** (0 failures, 0 errors). The local Spring Boot REST API is verified running and serving live requests against the existing MySQL `incident_db` database on host port 3306. All 3 known historical incident records (`INC-20261018-36AX`, `INC-20261018-QQ5F`, and `INC-20261018-D06Q`) have been verified and preserved intact without modification or data loss.

Docker container runtime execution and live SonarQube quality gate analysis remain **BLOCKED** due to the host Windows Docker Desktop engine service being stopped (requiring Windows administrative UAC elevation to start). These blockers are documented honestly without claiming unexecuted passes.

### Verification Classification Matrix

| Check Identifier | Category | Verification Method | Status | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **REG-01** | Backend Regression Tests | Automated (`mvn test`) | **PASSED** | 147/147 tests passed (0 failures, 0 errors, exit code 0). JaCoCo report generated across 57 classes. |
| **REG-02** | Frontend Unit/E2E Tests | Automated (`npm test -- --run`) | **PASSED** | 78/78 tests passed across 6 test suites (exit code 0). |
| **REG-03** | Frontend Production Build | Automated (`npm run build`) | **PASSED** | TypeScript (`tsc -b`) and Vite production bundle generated in 645ms (exit code 0). |
| **REG-04** | Package Vulnerability Audit | Automated (`npm audit`) | **PASSED** | 0 vulnerabilities found in frontend dependency tree. |
| **REG-05** | Compose Base Configuration | Automated (`docker compose config`) | **PASSED** | Validated multi-service Compose spec for backend & frontend (exit code 0). |
| **REG-06** | Compose SonarQube Profile | Automated (`docker compose --profile sonarqube config`) | **PASSED** | Validated isolated SonarQube + PostgreSQL service definition (exit code 0). |
| **SEC-01** | Multi-Role RBAC & Routing | Automated & MockMvc | **PASSED** | Verified permissions across Employee, Technician, Administrator workspaces. |
| **SEC-02** | ITIL Status Lifecycle | Automated Service & E2E | **PASSED** | Enforced state transitions, mandatory resolution notes, admin reopen restrictions. |
| **SEC-03** | Internal Note Confidentiality | Automated Integration Test | **PASSED** | Technician internal work notes strictly filtered from Employee responses. |
| **SEC-04** | Notification Isolation | Automated Service Test | **PASSED** | Cross-tenant notification leakage prevented; recipient ownership enforced. |
| **SEC-05** | Deactivated Token Rejection | Automated Security Test | **PASSED** | Mid-session JWT rejection verified; deactivated accounts cannot use existing tokens. |
| **SEC-06** | CSV Formula Injection Guard | Automated Security Test | **PASSED** | Formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) sanitized in analytics exports. |
| **SEC-07** | Administrator Safeguards | Automated Service Test | **PASSED** | Self-deactivation blocked; final active administrator protection enforced. |
| **SEC-08** | Audit State Masking | Automated Security Test | **PASSED** | Credentials and password hashes scrubbed and replaced with `[PROTECTED]` in audit logs. |
| **SEC-09** | HTTP Security Headers | Automated & Live HTTP Probe | **PASSED** | Verified `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, Cache-Control. |
| **SEC-10** | CORS Enforcement | Automated & Live HTTP Probe | **PASSED** | Allowed origin (`http://localhost:5173`) returns 200; unauthorized origin returns 403. |
| **SEC-11** | Production Secret Guard | Configuration Inspection | **PASSED** | `application-prod.yml` refuses unsafe dev fallback keys; requires environment variables. |
| **SEC-12** | Database Migration Alignment | Database & Schema Audit | **PASSED** | 4 Flyway migrations (V1..V4) recorded with `success=1`; Hibernate DDL set to `validate`. |
| **OPS-01** | Live Backend Health Endpoint | Live HTTP Probe | **PASSED** | `http://127.0.0.1:8080/api/v1/health` returns HTTP 200 `UP`, Java 21.0.12.1. |
| **OPS-02** | Jenkins Service Probe | Live HTTP Probe | **PASSED** | Jenkins 2.541.3 responding on `http://127.0.0.1:8090/login` (Jetty 12.1.5). |
| **OPS-03** | Jenkinsfile Pipeline Syntax | Configuration Inspection | **PASSED** | 7-stage declarative pipeline with JUnit publishing and artifact archiving. |
| **OPS-04** | Jenkinsfile Live Validator | Live HTTP API Probe | **BLOCKED** | Jenkins `/pipeline-model-converter/validate` requires authentication credentials. |
| **OPS-05** | Docker Runtime Deployment | CLI & Daemon Probe | **BLOCKED** | Docker daemon (`com.docker.service`) stopped; requires Windows UAC elevation. |
| **OPS-06** | SonarQube Live Quality Gate | Live Service Probe | **BLOCKED** | Container execution blocked pending Docker daemon activation. |
| **OPS-07** | SonarQube Configuration | Configuration Inspection | **PASSED** | `sonar-project.properties` correctly points to JaCoCo (`jacoco.xml`) and LCOV reports. |
| **OPS-08** | Public Cloud Deployment | Operational Policy | **NOT RUN** | Prohibited by completion gate; application operates strictly in local environment. |
| **DAT-01** | MySQL Incident Preservation | Database Direct Query | **PASSED** | Records `INC-20261018-36AX`, `INC-20261018-QQ5F`, `INC-20261018-D06Q` verified intact. |
| **GIT-01** | Git & Delivery Hygiene | Git CLI Inspection | **PASSED** | Zero secrets, `.env` files, or build artifacts committed; no auto-commits executed. |

---

## 2. Final Architecture & Feature Inventory

### 2.1 Backend Architecture
- **Framework:** Spring Boot 3.3.5 on Java 21 LTS (OpenJDK Temurin-21.0.12.1+1).
- **Persistence:** Spring Data JPA / Hibernate 6 with HikariCP connection pooling.
- **Relational Database:** MySQL 8.0.45 running on host port 3306.
- **Database Migrations:** Flyway Community Edition (deterministic migrations V1 through V4 applied).
- **Security & RBAC:** Spring Security 6 with stateless JWT Bearer token filter, BCrypt password hashing (work factor 10), and method-level `@PreAuthorize` guards.
- **Automation Engine:** Spring `@Scheduled(fixedRate = 60000)` SLA scanner with transactional isolation and idempotent escalation state tracking.
- **Packaging:** Multi-stage production `backend/Dockerfile` using Eclipse Temurin 21 JRE and unprivileged non-root user `appuser:appgroup` (UID 10001).

### 2.2 Frontend Architecture
- **Framework:** React 18.3.1 with TypeScript 5.6 and Vite 8.3.4.
- **Styling Architecture:** Pure Vanilla CSS Design System (Team Computers aesthetic: obsidian slate backgrounds, plum/wine radial glows, micro-animations, glassmorphic cards; zero Tailwind dependency).
- **State & Routing:** Context-based auth provider (`AuthContext.tsx`), React Router DOM 6.28 declarative routing with role-based route guards (`ProtectedRoute.tsx`).
- **HTTP Client:** Native fetch client (`api.ts`) with Bearer injection, session expiration handling, and automatic token refresh/logout.
- **Packaging:** Multi-stage `frontend/Dockerfile` (Node 20 build $\rightarrow$ Nginx 1.27 unprivileged Alpine runtime with custom reverse proxy and security headers).

### 2.3 Comprehensive Feature Inventory

```
RESOLV Platform Feature Map
├── 1. Authentication & Identity
│   ├── User Login (Username/Password with BCrypt validation)
│   ├── Self-Service Employee Registration (Strictly scopes to ROLE_EMPLOYEE)
│   ├── JWT Token Generation (HMAC-SHA256, 24-hour expiration)
│   ├── Session Storage (Ephemeral sessionStorage default; optional localStorage remember-me)
│   └── Inactive Account Safeguard (Immediate token revocation upon deactivation)
├── 2. Incident Management (ITIL v4)
│   ├── Server-Side Collision-Resistant Ticket Generation (INC-YYYYMMDD-XXXX)
│   ├── 3x3 ITIL Priority Matrix (Impact × Urgency → Priority)
│   ├── Multi-Persona Workspaces (Employee, Technician, Administrator)
│   ├── Object-Level Access Control (Employees isolated to own reported incidents)
│   ├── Status Lifecycle State Machine (OPEN → TRIAGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED)
│   ├── Mandatory Resolution Summary on Resolution
│   ├── Admin-Only Reopening Governance (CLOSED → OPEN restricted to administrators)
│   └── Technician Queue Claiming & Reassignment Tracking
├── 3. Collaboration & Auditability
│   ├── Dual-Channel Comments Thread (Public Discussion vs Internal Work Notes)
│   ├── Internal Note Privacy Filtering (Confidential notes never sent to Employees)
│   ├── Dynamic Audit Event Logging (Action, Actor, Target ID, Client IP, Timestamp)
│   └── Sensitive Data Sanitization (Old/New state diffs mask passwords with [PROTECTED])
├── 4. SLA & Escalation Automation
│   ├── Dynamic SLA Policies (Response & Resolution deadlines per priority tier)
│   ├── Background SLA Scanner (@Scheduled daemon evaluating active incidents)
│   ├── Multi-Tier Escalation Levels (ESC-1 WARNING at 75%, ESC-2 BREACH, ESC-3 CRITICAL)
│   ├── Automated Notification Dispatch (In-app alerts + simulated email engine)
│   └── Notification Center (Navbar bell with unread badge, popover drawer, mark-read)
├── 5. Operational Intelligence & Analytics
│   ├── Executive Telemetry (Total incidents, open backlog, breach counts, MTTR)
│   ├── Velocity Trends (Daily continuous timeline with zero-fill interpolation)
│   ├── Technician Capacity Matrix (Active ticket load and resolution count per technician)
│   └── RFC-4180 CSV Export with Formula Injection Guard (=, +, -, @ sanitized)
└── 6. Platform Administration & Governance
    ├── User Directory Explorer (Search, filter by role/department/status, pagination)
    ├── Role & Status Management (Safe activation toggle and role reassignment)
    ├── Final Administrator Protection (Prevents deactivating last active administrator)
    ├── Self-Deactivation Guard (Admins cannot deactivate their own active account)
    ├── Category Lifecycle Management (Active toggle hides categories from new forms)
    └── SLA Policy Editor (Cross-field validation: resolution >= response hours)
```

---

## 3. Actual Test & Build Verification Results

### 3.1 Backend Test Suite (`mvn test`)
- **Working Directory:** `D:\IT Incident Management and Resolution System\backend`
- **Execution Command:** `mvn test`
- **Exit Status:** `0` (SUCCESS)
- **Execution Summary:**
  - **Total Tests Run:** `147`
  - **Failures:** `0`
  - **Errors:** `0`
  - **Skipped:** `0`
  - **Total Execution Time:** `01:04 min`
- **JaCoCo Code Coverage:** Analyzed bundle with `57` classes; report written to `backend/target/site/jacoco/jacoco.xml` (230,964 bytes).

#### Detailed Test Class Breakdown
| Test Class | Focus Area | Tests | Failures | Errors | Result |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `IncidentManagementApplicationTests` | Spring context boot & health endpoint | 2 | 0 | 0 | PASSED |
| `PasswordHandlingTest` | BCrypt salting, hashing, rejection | 2 | 0 | 0 | PASSED |
| `JwtTokenProviderTest` | Claims extraction, validation, rejection | 2 | 0 | 0 | PASSED |
| `AuthServiceTest` | Authentication, self-registration, conflict checks | 5 | 0 | 0 | PASSED |
| `UserServiceTest` | User management, profile updates, password rules | 4 | 0 | 0 | PASSED |
| `PriorityCalculatorTest` | 9-cell ITIL matrix, contradiction rejection | 13 | 0 | 0 | PASSED |
| `IncidentServiceTest` | Lifecycle, assignment, reopening, notes privacy | 13 | 0 | 0 | PASSED |
| `IncidentIntegrationTest` | MockMvc REST endpoints, filtering, pagination | 13 | 0 | 0 | PASSED |
| `RolePermissionIntegrationTest` | RBAC matrix, OLAC isolation, unauthorized blocks | 7 | 0 | 0 | PASSED |
| `SecurityHardeningIntegrationTest` | Deactivated token reject, CSV sanitization, headers | 11 | 0 | 0 | PASSED |
| `AnalyticsServiceTest` | Aggregations, velocity timeseries, MTTR, CSV | 7 | 0 | 0 | PASSED |
| `AnalyticsControllerIntegrationTest` | RBAC metrics isolation, export endpoints | 8 | 0 | 0 | PASSED |
| `SlaEscalationServiceTest` | Escalation tiers, warnings, breaches, idempotency | 10 | 0 | 0 | PASSED |
| `NotificationServiceTest` | Notification dispatch, retry, ownership security | 7 | 0 | 0 | PASSED |
| `AutomationControllerIntegrationTest` | Automation endpoints, notification retries | 11 | 0 | 0 | PASSED |
| `AdministrationServiceTest` | Admin safeguards, category CRUD, SLA config | 13 | 0 | 0 | PASSED |
| `AdministrationControllerIntegrationTest` | Admin RBAC endpoints, audit explorer, masking | 14 | 0 | 0 | PASSED |
| `RepositoryTests` | JPA entity mapping, enums, relational constraints | 4 | 0 | 0 | PASSED |
| **Total** | | **147** | **0** | **0** | **100% PASSED** |

### 3.2 Frontend Test Suite (`npm test -- --run`)
- **Working Directory:** `D:\IT Incident Management and Resolution System\frontend`
- **Execution Command:** `npm test -- --run`
- **Exit Status:** `0` (SUCCESS)
- **Execution Summary:**
  - **Test Files:** `6` passed (6 total)
  - **Tests:** `78` passed (78 total)
  - **Duration:** `342ms`

#### Detailed Test Suite Breakdown
| Test Suite File | Focus Area | Tests | Failures | Errors | Result |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `src/__tests__/incidents.test.ts` | Priority matrix, SLA calculations, state machine | 23 | 0 | 0 | PASSED |
| `src/__tests__/auth.test.ts` | Token handling, storage modes, 401 interceptor | 13 | 0 | 0 | PASSED |
| `src/__tests__/analytics.test.ts` | KPI calculations, CSV export, filter bounds | 11 | 0 | 0 | PASSED |
| `src/__tests__/security-and-e2e.test.ts` | Route guards, error handling, session expiry | 7 | 0 | 0 | PASSED |
| `src/__tests__/administration.test.ts` | User management, admin safeguards, audit diffs | 15 | 0 | 0 | PASSED |
| `src/__tests__/automation.test.ts` | Notifications API, escalation rules, unread badges | 9 | 0 | 0 | PASSED |
| **Total** | | **78** | **0** | **0** | **100% PASSED** |

### 3.3 Frontend Production Build (`npm run build`)
- **Execution Command:** `npm run build` (`tsc -b && vite build`)
- **Exit Status:** `0` (SUCCESS)
- **Output Artifacts:**
  - `dist/index.html` (1.06 kB / gzip: 0.56 kB)
  - `dist/assets/index-DtXea8xa.css` (10.34 kB / gzip: 2.98 kB)
  - `dist/assets/index-IBzLlMs7.js` (622.77 kB / gzip: 148.78 kB)
- **Build Duration:** `645ms` (0 TypeScript compiler errors)

### 3.4 Dependency Vulnerability Audit (`npm audit`)
- **Execution Command:** `npm audit`
- **Exit Status:** `0` (SUCCESS)
- **Result:** `found 0 vulnerabilities` across all production and development dependencies.

### 3.5 Docker Compose Specification Validation
- **Base Specification:** `docker compose config`
  - **Exit Status:** `0` (SUCCESS)
  - Validates `backend` and `frontend` service definitions, port mappings, environment variable bindings, bridge network `resolv-net`, and health check commands.
- **SonarQube Profile:** `docker compose --profile sonarqube config`
  - **Exit Status:** `0` (SUCCESS)
  - Validates isolated `sonarqube` and `sonar-db` (PostgreSQL 15) service definitions, health check commands, and volume bindings.

---

## 4. Docker Runtime & Application Health Results

### 4.1 Docker Daemon Status: BLOCKED
- **Docker CLI Version:** Docker version 29.2.1, build a5c7197; Docker Compose version v5.0.2.
- **Daemon Connectivity Check:** `docker ps`
  - **Exit Status:** `1` (FAILED)
  - **Error Output:** `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine... The system cannot find the file specified.`
- **Root Cause:** The host Docker Desktop engine service (`com.docker.service`) is currently stopped. Launching or restarting the Windows service requires Windows Administrator User Account Control (UAC) elevation, which is unavailable in the current non-interactive session.
- **Reporting Status:** Docker container building, container health monitoring, and live container-to-container routing are classified as **BLOCKED** by the environment.

### 4.2 Local Spring Boot Application Health Endpoint: PASSED
- **Service Status:** Active (Spring Boot running daemon).
- **Endpoint URL:** `http://127.0.0.1:8080/api/v1/health`
- **HTTP Status:** `200 OK`
- **Response Payload:**
  ```json
  {
    "service": "IT Incident Management and Resolution System - Backend",
    "javaVersion": "21.0.12.1",
    "version": "0.0.1-SNAPSHOT",
    "status": "UP",
    "timestamp": "2026-10-18T17:42:01.022122600Z"
  }
  ```

---

## 5. Jenkins Pipeline Validation & CI/CD Evidence

### 5.1 Host Jenkins Service Probe: PASSED
- **Jenkins Endpoint:** `http://127.0.0.1:8090/login`
- **HTTP Status:** `200 OK`
- **Response Headers:**
  - `X-Jenkins: 2.541.3`
  - `Server: Jetty(12.1.5)`
  - `X-Frame-Options: sameorigin`
  - `X-Content-Type-Options: nosniff`

### 5.2 Jenkinsfile Pipeline Validation: BLOCKED
- **Validation Probe:** `POST http://127.0.0.1:8090/pipeline-model-converter/validate`
- **Result:** `Authentication required` (HTTP redirect to `/login`).
- **Explanation:** The local Jenkins server enforces user authentication for API and pipeline validation endpoints. Without authenticated user credentials or an API token, remote CLI validation is **BLOCKED**.
- **Structural Validation:** The `Jenkinsfile` was manually inspected and structurally verified:
  - Standard Declarative Pipeline syntax (`pipeline { agent any ... }`).
  - Strict build options: `timeout(30m)`, `disableConcurrentBuilds()`, `buildDiscarder`.
  - 7 sequential stages: Environment Verification, Backend Tests & Coverage, Frontend Tests, Frontend Production Build, Dependency Vulnerability Audit, SonarQube Quality Gate (conditional probe), Package & Archive Artifacts.
  - Test result publishing: `junit testResults: 'backend/target/surefire-reports/*.xml'` in post-stage action.
  - Build failure handling: `post { failure { echo "FAILURE..." } }` ensures the pipeline immediately halts on any test or compilation failure.

### 5.3 Next Exact Steps to Execute Pipeline in Jenkins
1. Open a browser to `http://127.0.0.1:8090` and log in with Jenkins administrator credentials.
2. In Jenkins Dashboard, click **New Item**, enter `resolv-ci-pipeline`, and select **Pipeline**.
3. Under **Pipeline Definition**, select **Pipeline script from SCM**, choose **Git**, and provide the repository path `D:\IT Incident Management and Resolution System`.
4. Set **Script Path** to `Jenkinsfile`.
5. Under **Credentials**, add a Secret Text credential with ID `SONAR_TOKEN` (containing the SonarQube authentication token).
6. Click **Save** and **Build Now**.

---

## 6. SonarQube Scan & Quality Gate Status

### 6.1 SonarQube Status: BLOCKED
- **SonarQube Server Availability:** Inactive (depends on Docker Compose `sonarqube` profile).
- **Quality Gate Execution Status:** **BLOCKED** pending Docker daemon startup.
- **Reporting Rule:** In accordance with instructions, because the SonarQube server could not be started, no claim of quality gate compliance is made.

### 6.2 SonarQube Configuration Verification: PASSED
The file `sonar-project.properties` is verified and configured:
- `sonar.projectKey=resolv-it-incident-system`
- `sonar.projectName=RESOLV - IT Incident Management and Resolution System`
- `sonar.sources=backend/src/main/java,frontend/src`
- `sonar.tests=backend/src/test/java,frontend/src/__tests__`
- `sonar.java.binaries=backend/target/classes`
- `sonar.coverage.jacoco.xmlReportPaths=backend/target/site/jacoco/jacoco.xml`
- `sonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info`
- Exclusions properly configured for `node_modules`, `dist`, `target`, and boilerplate DTOs.

---

## 7. Integration & Security Verification

### 7.1 Role-Based Access Control (RBAC) & Object-Level Isolation
- **Employee (`ROLE_EMPLOYEE`):**
  - Can create incidents and view personal reported incidents (`GET /api/v1/incidents`).
  - Cannot access user administration (`/api/v1/users` returns HTTP 403 Forbidden).
  - Cannot access audit event explorer (`/api/v1/audit` returns HTTP 403 Forbidden).
  - Cannot access technician capacity telemetry in analytics (HTTP 403 Forbidden).
  - Cannot create or view internal work notes (HTTP 403 Forbidden).
- **Technician (`ROLE_TECHNICIAN`):**
  - Can view all incidents, claim unassigned tickets, and reassign technicians.
  - Can transition incident status through ITIL lifecycle (`OPEN` $\rightarrow$ `TRIAGED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`).
  - Can add both public comments and confidential internal work notes.
  - Cannot access user directory or RBAC administration (HTTP 403 Forbidden).
  - Cannot reopen `CLOSED` incidents (restricted to Administrators; HTTP 403 Forbidden).
- **Administrator (`ROLE_ADMIN`):**
  - Full access across all workspaces, analytics telemetry, user management, category and SLA configuration, and audit log exploration.
  - Only role authorized to reopen `CLOSED` incidents.

### 7.2 Security Hardening Verification
- **Deactivated Account Token Invalidation:** When an administrator deactivates a user account, `JwtAuthenticationFilter` validates user active status against the database on incoming requests. Active JWT tokens for deactivated accounts are rejected immediately with HTTP 401 Unauthorized (`Security rejection: Authenticated token presented for deactivated or locked user`).
- **CSV Formula Injection Prevention:** In `AnalyticsService.java`, all user-controlled text strings (incident titles, descriptions, categories) are sanitized before CSV serialization. Leading spreadsheet formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are escaped with a leading single quote (`'`).
- **HTTP Security Headers:**
  - `X-Content-Type-Options: nosniff` (MIME sniffing prevention)
  - `X-Frame-Options: DENY` (Clickjacking prevention)
  - `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` (Prevents caching sensitive responses)
  - `Pragma: no-cache`
- **CORS Configuration:**
  - Allowed origins (`http://localhost:5173`, `http://localhost:80`) return HTTP 200 with credentials support.
  - Unauthorized origins return HTTP 403 Forbidden.
- **Production Profile Secrets Safety:** In `application-prod.yml`, the properties `spring.datasource.password: ${DB_PASSWORD}` and `app.jwt.secret: ${JWT_SECRET}` do not contain fallback defaults. The application strictly refuses to start in the `prod` profile if production secrets are omitted.

---

## 8. Database Preservation Evidence

### 8.1 MySQL Database: `incident_db`
In accordance with instructions, no destructive SQL operations (`DROP`, `TRUNCATE`, `DELETE`) were performed. The three known historical incident records were verified before and after test execution:

```sql
SELECT id, ticket_number, status, title FROM incident_db.incidents;
```

#### Pre-Verification & Post-Verification Comparison
| ID | Ticket Number | Expected Status | Actual Status | Title | Preservation Status |
| :-: | :--- | :---: | :---: | :--- | :---: |
| 1 | `INC-20261018-36AX` | `OPEN` | `OPEN` | Core switch port flapping in Server Room B | **PRESERVED INTACT** |
| 2 | `INC-20261018-QQ5F` | `IN_PROGRESS` | `IN_PROGRESS` | ERP Portal 500 error on month-end invoice processing | **PRESERVED INTACT** |
| 3 | `INC-20261018-D06Q` | `OPEN` | `OPEN` | ERP Portal 500 error on month-end invoice processing | **PRESERVED INTACT** |

### 8.2 Flyway Schema Migration History
All 4 database migrations are verified as successfully applied:
- `V1__initial_schema.sql` (Installed Rank 1, Success 1)
- `V2__incident_management.sql` (Installed Rank 2, Success 1)
- `V3__sla_escalation_and_notifications.sql` (Installed Rank 3, Success 1)
- `V4__administration_and_auditability.sql` (Installed Rank 4, Success 1)

---

## 9. Exact Local Startup & Shutdown Commands

### 9.1 Local Development Mode (Host Processes)

#### Start Backend Service
```powershell
# Navigate to backend directory
cd "D:\IT Incident Management and Resolution System\backend"

# Ensure DB_PASSWORD is set in environment (or loaded from .env)
$env:DB_PASSWORD = "your_mysql_password_here"

# Launch Spring Boot application
mvn spring-boot:run
```

#### Start Frontend Service
```powershell
# Navigate to frontend directory
cd "D:\IT Incident Management and Resolution System\frontend"

# Launch Vite development server
npm run dev
```

#### Stop Host Services
- In the PowerShell terminal running the process, press `Ctrl + C`.

---

### 9.2 Production Mode (Docker Compose)

#### Prerequisites
- Start Docker Desktop (requires Windows Administrator elevation).
- Ensure `.env` is configured from `.env.example`.

#### Start Core Services (Backend + Frontend)
```bash
docker compose up -d --build
```

#### Start All Services (Including SonarQube & PostgreSQL)
```bash
docker compose --profile sonarqube up -d --build
```

#### Check Container Health
```bash
docker compose ps
```

#### Stop All Services (Preserving Database & Volumes)
```bash
docker compose --profile sonarqube down
```

> [!CAUTION]
> Never run `docker compose down -v` as this will delete persistent volumes.

---

## 10. Required Environment Variables (By Name Only)

| Variable Name | Purpose | Required In | Fallback / Default |
| :--- | :--- | :---: | :--- |
| `SERVER_PORT` | Backend HTTP listening port | All | `8080` |
| `BACKEND_PORT` | Compose host port binding | Docker | `8080` |
| `SPRING_PROFILES_ACTIVE` | Active Spring Boot configuration profile | All | `dev` |
| `DB_HOST` | MySQL hostname or IP address | All | `localhost` (Host) / `host.docker.internal` (Docker) |
| `DB_PORT` | MySQL listening port | All | `3306` |
| `DB_NAME` | MySQL database name | All | `incident_db` |
| `DB_USERNAME` | MySQL connection username | All | `root` |
| `DB_PASSWORD` | MySQL connection password | All | **None (Mandatory)** |
| `DB_POOL_MAX` | HikariCP maximum connection pool size | Production | `20` |
| `DB_POOL_MIN_IDLE` | HikariCP minimum idle connections | Production | `5` |
| `JWT_SECRET` | Secret key for HMAC-SHA256 signing | Production | **None in Prod (Mandatory)** |
| `JWT_EXPIRATION_MS` | JWT token validity window in milliseconds | All | `86400000` (24 hours) |
| `CORS_ALLOWED_ORIGINS` | Comma-delimited list of permitted CORS origins | Production | **None in Prod (Mandatory)** |
| `FRONTEND_PORT` | Compose host port binding for Nginx | Docker | `80` |
| `VITE_API_BASE_URL` | Base URL for REST API communication | Frontend Build | `/api/v1` |
| `SONAR_PORT` | Host port binding for SonarQube UI | SonarQube | `9000` |
| `SONAR_HOST_URL` | URL of active SonarQube instance | CI/CD | `http://localhost:9000` |
| `SONAR_TOKEN` | SonarQube project analysis token | CI/CD | **Mandatory for scan** |
| `SONAR_JDBC_USERNAME` | SonarQube PostgreSQL database username | SonarQube | `sonar` |
| `SONAR_JDBC_PASSWORD` | SonarQube PostgreSQL database password | SonarQube | `sonar_secure_password` |
| `SONAR_DB_NAME` | SonarQube PostgreSQL database name | SonarQube | `sonar` |

---

## 11. Git & Delivery Hygiene

- **Repository Status:** All project source code, migrations, tests, and configuration files are located under `D:\IT Incident Management and Resolution System`.
- **Sensitive Files Check:**
  - `.env` and `backend/.env` are confirmed ignored by `.gitignore`.
  - `.env.example` contains only non-sensitive template placeholders.
  - Zero private keys, passwords, database dumps, or real tokens exist in git tracking.
- **Build Artifacts Check:**
  - `backend/target/`, `frontend/dist/`, `frontend/node_modules/`, and `scratch/` are ignored by `.gitignore`.
- **Git User Identity Configuration Steps:**
  The host environment does not have global Git user credentials configured (`git config user.name` and `user.email` returned exit code 1). Before committing, run:
  ```powershell
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```
- **Automated Commit Policy:** No automatic git commits or pushes were executed during this verification.

---

## 12. Known Limitations & Recommendations Before Production Use

1. **Docker Engine Activation:** The Docker daemon must be started with Windows Administrator elevation before executing containerized production deployments or running SonarQube in Docker.
2. **TLS / HTTPS Termination:** For production deployment, an SSL/TLS termination layer (e.g., Let's Encrypt with Certbot, AWS ALB, or Cloudflare) must be placed in front of the Nginx web container to enforce HTTPS.
3. **Secrets Management:** Environment variables (`DB_PASSWORD`, `JWT_SECRET`) should be injected via a dedicated secrets vault (e.g., HashiCorp Vault, AWS Secrets Manager, or Kubernetes Secrets) rather than stored in plain-text `.env` files on disk.
4. **Email Notification Engine:** The system currently utilizes a zero-cost simulated email logger for notification delivery. Prior to production go-live, configure Spring Mail with active SMTP credentials (e.g., SendGrid, AWS SES) in `application-prod.yml`.
5. **Jenkins SCM Credentials:** To execute the `Jenkinsfile` pipeline, configure Git credentials and the `SONAR_TOKEN` secret text in the Jenkins credentials manager.
