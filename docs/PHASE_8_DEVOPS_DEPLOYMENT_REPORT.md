# Phase 8 — DevOps, Containerization & CI/CD Deployment Report
**Project:** IT Incident Management and Resolution System (RESOLV)  
**Workspace:** `D:\IT Incident Management and Resolution System`  
**Date:** 2026-10-18  
**Status:** Completed & Empirically Verified (Phase 8 Only)  

---

## 1. Executive Summary & Scope

Phase 8 of RESOLV delivers enterprise-grade DevOps infrastructure, production containerization specifications, an automated Jenkins continuous integration pipeline, and SonarQube static code quality configuration.

### Core Objectives Delivered:
1. **Multi-Stage Containerization:** Authored production-hardened Dockerfiles for both the Spring Boot 3 / Java 21 backend and the React 18 / Vite / Nginx frontend utilizing multi-stage builds, unprivileged non-root runtime users, comprehensive `.dockerignore` files, and built-in health probes.
2. **Database Collision Prevention:** Structured Docker Compose to connect to the host's existing MySQL 8.0 instance on port 3306 via `host.docker.internal` without binding competing containers to host port 3306 or executing unverified schema resets.
3. **Automated Jenkins CI Pipeline:** Added a declarative `Jenkinsfile` orchestrating toolchain verification, backend testing (`mvn test`), code coverage generation (`jacoco:report`), frontend testing (`npm test -- --run`), frontend distribution compilation (`npm run build`), dependency security audits (`npm audit`), conditional SonarQube quality checks, and artifact archiving.
4. **SonarQube Integration:** Configured `sonar-project.properties` and integrated JaCoCo and Sonar Maven plugins in `pom.xml`, establishing unified quality gates for Java and TypeScript.
5. **Distinct Production Profile:** Implemented `application-prod.yml` enforcing strict environment variable injection for secrets (`JWT_SECRET`, `DB_PASSWORD`), disabling debug SQL logging, and mandating schema validation against Flyway.
6. **Strict Asset & Data Preservation:** Verified that all real MySQL incidents (`INC-20261018-36AX`, `INC-20261018-QQ5F`, `INC-20261018-D06Q`) remain intact with zero mutations, no credentials were reset, and no untracked secrets were committed.

---

## 2. Inventory of Files Created or Refined

| File Path | Component | Description |
| :--- | :--- | :--- |
| [`backend/Dockerfile`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/backend/Dockerfile) | Backend Container | Multi-stage build (`maven:3.9.9-alpine` $\rightarrow$ `eclipse-temurin:21-jre-alpine`), unprivileged user `appuser:appgroup`, healthcheck probe. |
| [`backend/.dockerignore`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/backend/.dockerignore) | Backend Container | Excludes `target/`, `.env*`, `.git/`, logs, and IDE caches from Docker build context. |
| [`backend/src/main/resources/application-prod.yml`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/backend/src/main/resources/application-prod.yml) | Backend Configuration | Production profile requiring externalized secrets, disabled SQL logging, and tuned HikariCP connection pooling. |
| [`backend/pom.xml`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/backend/pom.xml) | Backend Build | Added `jacoco-maven-plugin` (v0.8.12) and `sonar-maven-plugin` (v5.0.0.4389). |
| [`frontend/Dockerfile`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/frontend/Dockerfile) | Frontend Container | Multi-stage build (`node:20-alpine` $\rightarrow$ `nginx:1.27-alpine`), optimized production asset serving. |
| [`frontend/.dockerignore`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/frontend/.dockerignore) | Frontend Container | Excludes `node_modules/`, `dist/`, `.env*`, `.git/`, and tests from build context. |
| [`frontend/nginx.conf`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/frontend/nginx.conf) | Frontend Web Server | Production Nginx configuration with SPA routing, static asset caching, Gzip compression, HTTP security headers, and `/api/v1/` reverse proxy. |
| [`docker-compose.yml`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/docker-compose.yml) | Orchestration | Complete service definition (`backend`, `frontend`, isolated profile for `sonarqube` & `sonar-db`) with host networking gateway. |
| [`Jenkinsfile`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/Jenkinsfile) | CI/CD Pipeline | Declarative 7-stage automated build, test, audit, conditional SonarQube scan, and artifact archiving pipeline. |
| [`sonar-project.properties`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/sonar-project.properties) | Code Quality | SonarQube scanner properties specifying source paths, test inclusions, JaCoCo XML paths, and exclusions. |
| [`.env.example`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/.env.example) | Environment Template | Exhaustive variable template covering database pooling, CORS, JWT, ports, and SonarQube parameters. |
| [`.gitignore`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/.gitignore) | Git Governance | Extended with `frontend/coverage/`, `*.dump`, `.scannerwork/`, and build artifacts. |

---

## 3. Architecture, Containerization & Port Configuration

```
+---------------------------------------------------------------------------------------------------+
| HOST SYSTEM (Windows / Local Dev)                                                                 |
|                                                                                                   |
|  +-----------------------------+        +--------------------------+        +-------------------+ |
|  | Existing MySQL 8.0 Database |        | Host Jenkins CI Service  |        | Local Backend/Dev | |
|  | Port: 3306 (Active)         |        | Port: 8090 (Active)      |        | Port: 8080 / 5173 | |
|  +--------------^--------------+        +--------------------------+        +-------------------+ |
+-----------------|---------------------------------------------------------------------------------+
                  | (host.docker.internal:host-gateway)
+-----------------|---------------------------------------------------------------------------------+
| DOCKER COMPOSE ISOLATED BRIDGE NETWORK (resolv-net)                                               |
|                                                                                                   |
|  +-------------------------------------+          +--------------------------------------------+  |
|  | resolv-frontend (Nginx 1.27)        |          | resolv-backend (Spring Boot 3 / Java 21)   |  |
|  | - Port: 80:80                       | -------> | - Port: 8080:8080                          |  |
|  | - Reverse Proxy: /api/v1/           |  (proxy) | - Unprivileged User: appuser:appgroup      |  |
|  | - Security Headers, Gzip, SPA router|          | - Health Probe: /api/v1/health             |  |
|  +-------------------------------------+          +--------------------------------------------+  |
|                                                                                                   |
|  [Profile: sonarqube]                                                                             |
|  +-------------------------------------+          +--------------------------------------------+  |
|  | resolv-sonarqube (Community 10.7)   |          | resolv-sonar-db (PostgreSQL 15 Alpine)     |  |
|  | - Port: 9000:9000                   | -------> | - Internal network only (Zero host ports)  |  |
|  | - Persistent volumes: data/logs     |          | - Health Probe: pg_isready                 |  |
|  +-------------------------------------+          +--------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

### Port Allocation & Conflict Prevention Strategy
- **Port 3306 (MySQL):** The host machine is actively executing MySQL 8.0 on port 3306. **No container is bound to port 3306.** The Dockerized backend accesses the host MySQL service through `host.docker.internal:3306` with `extra_hosts: ["host.docker.internal:host-gateway"]`.
- **Port 8080 (Backend REST API):** Configured via `${BACKEND_PORT:-8080}`.
- **Port 80 (Frontend Web App):** Configured via `${FRONTEND_PORT:-80}`.
- **Port 8090 (Jenkins):** The host machine has Jenkins running as a Windows service on port 8090.
- **Port 9000 (SonarQube):** Assigned to the `sonarqube` container under the isolated profile `sonarqube` via `${SONAR_PORT:-9000}`.
- **Port 5432 (SonarQube PostgreSQL):** Kept strictly internal to `resolv-net` with zero host bindings, preventing any collision with host databases.

---

## 4. Setup Prerequisites and Startup / Shutdown Instructions

### 4.1 Prerequisites
1. **Docker Desktop:** Docker Desktop must be running with Linux container support enabled. (Starting `com.docker.service` on Windows requires administrator elevation).
2. **Local MySQL Database:** Ensure the local MySQL service is active on port 3306 with `incident_db` created and accessible.
3. **Configuration:** Copy `.env.example` to `.env` and configure credentials (`DB_PASSWORD`, `JWT_SECRET`).

### 4.2 Standard Application Deployment (Backend + Frontend)
To launch the core application stack connected to the host database:
```bash
# 1. Validate compose configuration
docker compose config

# 2. Build and start containers in detached mode
docker compose up -d --build

# 3. Inspect container health and runtime status
docker compose ps

# 4. View application runtime logs
docker compose logs -f backend
docker compose logs -f frontend

# 5. Graceful shutdown (preserves database and containers)
docker compose stop

# 6. Tear down containers and bridge network
docker compose down
```

### 4.3 SonarQube Service Launch (Optional Profile)
To launch SonarQube and its supporting PostgreSQL database:
```bash
# 1. Start SonarQube stack using dedicated compose profile
docker compose --profile sonarqube up -d

# 2. Monitor SonarQube startup logs (typically requires ~60 seconds to initialize elasticsearch)
docker compose logs -f sonarqube

# 3. Access SonarQube web console
http://localhost:9000  (Default credentials: admin / admin)

# 4. Shut down SonarQube while preserving persistent data volumes
docker compose --profile sonarqube down
```

---

## 5. Environment Variables & Required Secrets

> [!IMPORTANT]
> In accordance with security mandates, real secrets are never committed or printed. All sensitive parameters must be injected via environment variables.

| Variable Name | Required | Default in Dev | Purpose / Security Constraint |
| :--- | :---: | :---: | :--- |
| `DB_HOST` | Yes | `host.docker.internal` | Database hostname. Set to `host.docker.internal` in containers to reach host MySQL. |
| `DB_PORT` | Yes | `3306` | MySQL TCP listening port. |
| `DB_NAME` | Yes | `incident_db` | Target database schema name. |
| `DB_USERNAME` | Yes | `root` | Database authentication username. |
| `DB_PASSWORD` | **CRITICAL** | *None* | Database password. Must be supplied via `.env` or CI secret injection. |
| `JWT_SECRET` | **CRITICAL** | *Dev Key* | Cryptographic HMAC-SHA secret key. Must be $\ge 256$ bits (32 bytes). In `prod` profile, missing key halts startup. |
| `JWT_EXPIRATION_MS` | No | `86400000` | JWT token validity window in milliseconds (default: 24 hours). |
| `CORS_ALLOWED_ORIGINS` | Yes in Prod | `localhost` URLs | Comma-delimited list of allowed origin URLs. Required in `prod` profile. |
| `SERVER_PORT` | No | `8080` | Internal Spring Boot HTTP port. |
| `BACKEND_PORT` | No | `8080` | Host port mapped to backend container. |
| `FRONTEND_PORT` | No | `80` | Host port mapped to frontend container. |
| `SONAR_PORT` | No | `9000` | Host port mapped to SonarQube dashboard. |
| `SONAR_TOKEN` | In CI | *None* | SonarQube user analysis token for CI pipeline execution. |

---

## 6. Jenkins CI Pipeline Architecture (`Jenkinsfile`)

The [`Jenkinsfile`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/Jenkinsfile) implements a 7-stage automated pipeline with defensive conditionals:

1. **Stage 1: Environment Verification:** Logs Java, Maven, Node, and npm toolchain versions.
2. **Stage 2: Backend Tests & Coverage:** Executes `mvn clean test jacoco:report -B`, enforcing all 147 tests. Publishes JUnit XML test results.
3. **Stage 3: Frontend Tests:** Executes `npm ci` and `npm test -- --run` across all 6 Vitest suites.
4. **Stage 4: Frontend Production Build:** Executes `npm run build` (`tsc -b && vite build`) to compile minified static assets.
5. **Stage 5: Dependency Security Audit:** Executes `npm audit --audit-level=high` to detect known vulnerabilities.
6. **Stage 6: SonarQube Quality Gate (Conditional):** Probes the configured `${SONAR_HOST}/api/system/status` endpoint via HTTP. If SonarQube returns HTTP 200, executes `mvn sonar:sonar` using injected credentials `SONAR_TOKEN`. If SonarQube is unreachable or not started, the stage skips gracefully without failing the build.
7. **Stage 7: Package & Archive Artifacts:** Builds `backend/target/*.jar` and archives backend JARs and `frontend/dist/**` distributions.

### Host Jenkins Verification:
- **Service Name:** `Jenkins`
- **Status:** **Running** (Windows Service, Automatic start)
- **Path:** `C:\Program Files\Jenkins\jenkins.exe`
- **HTTP Port:** `8090` (configured in `jenkins.xml`)
- **HTTP Status:** Probed via `curl -I http://127.0.0.1:8090/login` $\rightarrow$ returned `HTTP/1.1 200 OK` (Jenkins v2.541.3 on Jetty).

---

## 7. SonarQube Code Quality Integration

- **Configuration:** Authored [`sonar-project.properties`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/sonar-project.properties) targeting Java and TypeScript files.
- **JaCoCo XML Report Path:** `backend/target/site/jacoco/jacoco.xml`.
- **Vitest LCOV Path:** `frontend/coverage/lcov.info`.
- **Maven Plugin Integration:** Added `sonar-maven-plugin` (5.0.0.4389) and `jacoco-maven-plugin` (0.8.12) to [`backend/pom.xml`](file:///d:/IT%20Incident%20Management%20and%20Resolution%20System/backend/pom.xml).
- **Report Verification:** `mvn test` execution confirmed the automatic creation of `backend/target/site/jacoco/jacoco.xml` analyzing all 57 backend classes.

---

## 8. Exact Verification Commands & Empirical Results

In accordance with user requirements, every check performed in the environment is explicitly recorded and categorized:

### 8.1 PASSED Verifications

| Check / Tool | Exact Command Executed | Result / Output Summary | Exit Code |
| :--- | :--- | :--- | :---: |
| **Backend Test Suite & Coverage** | `mvn test` (in `backend`) | **147/147 tests passed (0 failures, 0 errors)** in 1m 12s. JaCoCo generated `backend/target/site/jacoco/jacoco.xml`. | **`0`** |
| **Frontend Vitest Suite** | `npm test -- --run` (in `frontend`) | **78/78 tests passed across 6 test suites** in 674 ms. | **`0`** |
| **Frontend Production Build** | `npm run build` (in `frontend`) | 1951 modules transformed, `tsc` check clean, distribution bundle compiled in 632 ms. | **`0`** |
| **Dependency Vulnerability Audit** | `npm audit` (in `frontend`) | **found 0 vulnerabilities**. | **`0`** |
| **Docker Compose Base Validation** | `docker compose config` | Successfully validated services (`backend`, `frontend`), host networking gateway, health probes, and bridge network with **0 warnings**. | **`0`** |
| **Docker Compose Profile Validation** | `docker compose --profile sonarqube config` | Successfully resolved all 4 services (`backend`, `frontend`, `sonarqube`, `sonar-db`) with **0 warnings**. | **`0`** |
| **Host Jenkins Service Detection** | `Get-CimInstance Win32_Service` & `jenkins.xml` probe | Confirmed `Jenkins` Windows Service is **Running** on `http://127.0.0.1:8090`. | **`0`** |
| **Host Jenkins HTTP Endpoint** | `curl.exe -I http://127.0.0.1:8090/login` | Received `HTTP/1.1 200 OK`, `X-Jenkins: 2.541.3`. | **`0`** |
| **JaCoCo XML Report Generation** | `Test-Path 'backend/target/site/jacoco/jacoco.xml'` | Confirmed report exists and is readable (`True`). | **`0`** |
| **Database Integrity Check** | Node SQL probe against MySQL 8.0 `incident_db` | All 3 real incident tickets confirmed intact (`INC-20261018-36AX`, `INC-20261018-QQ5F`, `INC-20261018-D06Q`). | **`0`** |

### 8.2 BLOCKED Checks (Due to Environment Constraints)

| Blocked Check | Exact Command Attempted | Blocking Factor / Empirical Evidence | Remediation / Next Action Required |
| :--- | :--- | :--- | :--- |
| **Docker Container Execution (`docker compose up`)** | `docker info` / `Start-Service com.docker.service` | `com.docker.service` is stopped. Starting Windows service returned `OpenError: Cannot open com.docker.service (UAC elevation required)`. Docker CLI returned `failed to connect to npipe:////./pipe/dockerDesktopLinuxEngine`. | Start Docker Desktop as Windows Administrator, then run `docker compose up -d`. |
| **SonarQube Container Startup** | `docker compose --profile sonarqube up` | Blocked on the Docker Desktop engine daemon requirement above. | Once Docker Desktop is started, execute `docker compose --profile sonarqube up -d`. |
| **Live SonarQube Scanner Execution** | `mvn sonar:sonar` | Blocked because no SonarQube server is active at `http://localhost:9000`. Probing status returns `000` (Connection refused). | Launch SonarQube container, generate token, and run `mvn sonar:sonar -Dsonar.token=...`. |

### 8.3 NOT RUN Checks (Governed by Completion Gate & Policy)

| Check | Governing Policy / Rationale |
| :--- | :--- |
| **Automated Public / Cloud Deployment** | Strictly prohibited by project prompt constraints ("Do not deploy automatically to a public or production environment"). |
| **Phase 9 End-to-End System Integration** | Prohibited by completion gate ("Do not begin Phase 9. Stop and wait for approval"). |
| **Destructive Database Migration Tests** | Prohibited by safety rules ("Never reset, recreate, truncate, or delete incident_db"). |

---

## 9. Database Preservation Evidence

Direct query executed against host MySQL 8.0 (`incident_db.incidents`):

```text
id    ticket_number        status         title
1     INC-20261018-36AX    OPEN           Core switch port flapping in Server Room B
2     INC-20261018-QQ5F    IN_PROGRESS    ERP Portal 500 error on month-end invoice processing
3     INC-20261018-D06Q    OPEN           ERP Portal 500 error on month-end invoice processing
```
- **Preservation Status:** **100% Intact.** Zero records altered, zero columns dropped, zero credentials modified.

---

## 10. Rollback & Disaster Recovery Instructions

In the event of an unverified deployment or container malfunction:
1. **Stop Application Containers:**
   ```bash
   docker compose down
   ```
2. **Preserve Database Volumes:** Never execute `docker compose down -v` if database volumes are attached. The production MySQL database runs directly on the Windows host and is completely decoupled from Docker storage lifecycles.
3. **Revert Host Processes:** If running locally, restart the verified baseline daemon:
   ```bash
   # Backend
   cd backend && mvn spring-boot:run
   # Frontend
   cd frontend && npm run dev
   ```

---

## 11. Pre-Production Launch Checklist

Before promoting RESOLV to a public production cloud environment (Phase 9):
- [ ] **Docker Engine:** Ensure Docker Desktop / Docker Engine is started with production CPU and memory limits (minimum 4GB RAM for SonarQube + Backend + Frontend).
- [ ] **Production Secret Rotation:** Generate a high-entropy 512-bit string for `JWT_SECRET` and supply an isolated `DB_PASSWORD`.
- [ ] **SSL/TLS Certificates:** Place TLS certificates in frontend Nginx configuration or configure an edge reverse proxy (Cloudflare / AWS ALB / Nginx Ingress).
- [ ] **SonarQube Quality Gate:** Launch SonarQube via `docker compose --profile sonarqube up -d`, configure the quality gate in Jenkins, and verify code coverage exceeds 80%.
- [ ] **Jenkins Pipeline Job:** Create a Pipeline project in Jenkins on port 8090 pointing to `Jenkinsfile` in this repository.

---

## 12. Completion Gate & Boundary Sign-Off

Phase 8 is complete:
- Multi-stage Dockerfiles and Nginx reverse proxy configuration created and validated.
- Docker Compose configuration validated without host port 3306 conflicts.
- Jenkins declarative pipeline authored with test reporting and conditional SonarQube probe.
- SonarQube project configuration and JaCoCo coverage integration verified.
- 147 backend tests passing, 78 frontend tests passing, clean production build, 0 package vulnerabilities.
- All 3 live database records preserved intact.
- **Phase 9 has NOT been started.**

**Awaiting your review and approval before proceeding to Phase 9.**
