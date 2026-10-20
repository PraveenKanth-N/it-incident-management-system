# Developer Setup & Onboarding Guide
**Project:** IT Incident Management and Resolution System  
**Workspace:** `D:\IT Incident Management and Resolution System`  

---

## 1. Environment Prerequisites

Ensure the following tools are installed on your host machine (as verified in [docs/ENVIRONMENT_ASSESSMENT.md](file:///D:/IT%20Incident%20Management%20and%20Resolution%20System/docs/ENVIRONMENT_ASSESSMENT.md)):
- **Java JDK 21 LTS** (`Eclipse Adoptium Temurin-21.0.12.101-hotspot`)
- **Apache Maven 3.9.14**
- **Node.js v24.14+** and **npm 11.9+**
- **Git 2.53+**
- **MySQL Server 8.0** (Running on port 3306)
- **Docker Desktop** (Required for SonarQube)
- **Jenkins** (Running on port 8090)

---

## 2. Setting Up MySQL Database

The application connects to your existing host MySQL Server 8.0 running on port 3306.

> [!IMPORTANT]
> The database `incident_db` must be created manually before running the backend in development mode, as non-destructive schema validation is enforced.

Log into MySQL via PowerShell or MySQL Workbench:
```powershell
mysql -u root -p
```

Execute the following commands to create the dedicated database and grant local access:
```sql
-- 1. Create the database
CREATE DATABASE IF NOT EXISTS incident_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 2. Verify creation
SHOW DATABASES;
```

---

## 3. Environment Variables Configuration

Copy the template configuration file in the project root:
```powershell
Copy-Item .env.example .env
```

Open `.env` and configure your credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=incident_db
DB_USERNAME=root
DB_PASSWORD=your_actual_mysql_password
```

---

## 4. Starting the Backend (Spring Boot 3.3.5)

In PowerShell:
```powershell
cd "D:\IT Incident Management and Resolution System\backend"

# 1. Verify build and run unit tests
mvn clean test

# 2. Run the application
mvn spring-boot:run
```

Once started, verify the health status:
- URL: [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- Expected response: `{"status":"UP","service":"IT Incident Management and Resolution System - Backend",...}`

---

## 5. Starting the Frontend (React 19 + TypeScript + Vite)

In a second PowerShell window:
```powershell
cd "D:\IT Incident Management and Resolution System\frontend"

# 1. Install dependencies (if not already run)
npm install

# 2. Start Vite development server
npm run dev
```

Open your browser to:
- URL: [http://localhost:5180](http://localhost:5180)

---

## 6. Running SonarQube via Docker Compose

1. **Launch Docker Desktop** on Windows.
2. Verify Docker engine is running:
   ```powershell
   docker info
   ```
3. Start the SonarQube and PostgreSQL container stack:
   ```powershell
   cd "D:\IT Incident Management and Resolution System"
   docker compose up -d
   ```
4. Access SonarQube dashboard:
   - URL: [http://localhost:9000](http://localhost:9000)
   - Default login: `admin` / `admin` (will prompt for password change upon first login)
5. Run code analysis from the `backend/` directory:
   ```powershell
   mvn clean verify sonar:sonar -Dsonar.projectKey=incident-management -Dsonar.host.url=http://localhost:9000 -Dsonar.login=YOUR_TOKEN
   ```
