-- ==============================================================================
-- IT Incident Management and Resolution System - Comprehensive Initial Schema
-- Migration: V1__initial_schema.sql
-- Engine: MySQL 8.0 / InnoDB / utf8mb4
-- ==============================================================================

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id BIGINT NOT NULL,
    department VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. SLA Policies Table
CREATE TABLE IF NOT EXISTS sla_policies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL UNIQUE,
    response_time_hours INT NOT NULL,
    resolution_time_hours INT NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Incident Categories Table
CREATE TABLE IF NOT EXISTS incident_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    sla_hours INT NOT NULL DEFAULT 24,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(30) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    status ENUM('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'NEW',
    category_id BIGINT NOT NULL,
    reporter_id BIGINT NOT NULL,
    assignee_id BIGINT NULL,
    sla_policy_id BIGINT NULL,
    resolution_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_incidents_category FOREIGN KEY (category_id) REFERENCES incident_categories (id) ON DELETE RESTRICT,
    CONSTRAINT fk_incidents_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_incidents_assignee FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_incidents_sla FOREIGN KEY (sla_policy_id) REFERENCES sla_policies (id) ON DELETE SET NULL,
    INDEX idx_incidents_status (status),
    INDEX idx_incidents_priority (priority),
    INDEX idx_incidents_ticket (ticket_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Incident Status History Table
CREATE TABLE IF NOT EXISTS incident_status_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NOT NULL,
    old_status ENUM('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NULL,
    new_status ENUM('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL,
    changed_by_id BIGINT NOT NULL,
    change_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_status_hist_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
    CONSTRAINT fk_status_hist_user FOREIGN KEY (changed_by_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_status_hist_incident (incident_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Incident Assignments Table
CREATE TABLE IF NOT EXISTS incident_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NOT NULL,
    assigned_by_id BIGINT NOT NULL,
    assigned_to_id BIGINT NOT NULL,
    assignment_notes VARCHAR(255) NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assign_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
    CONSTRAINT fk_assign_by FOREIGN KEY (assigned_by_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_assign_to FOREIGN KEY (assigned_to_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_assign_incident (incident_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Incident Comments / Work Notes Table
CREATE TABLE IF NOT EXISTS incident_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_comments_incident (incident_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    performed_by_id BIGINT NULL,
    previous_state TEXT NULL,
    new_state TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (performed_by_id) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Seed Initial Roles (Employee, Technician, Administrator)
INSERT INTO roles (name, description) VALUES
('ROLE_ADMIN', 'Administrator with full system configuration, user management, and reporting privileges'),
('ROLE_TECHNICIAN', 'IT Support Technician with incident triage, assignment, work note, and resolution privileges'),
('ROLE_EMPLOYEE', 'Standard Employee/End-User with ticket creation, personal tracking, and comment privileges')
ON DUPLICATE KEY UPDATE name=name;

-- 11. Seed SLA Policies
INSERT INTO sla_policies (name, priority, response_time_hours, resolution_time_hours, description) VALUES
('Critical Incident SLA', 'CRITICAL', 1, 4, 'Service outage or critical business interruption'),
('High Incident SLA', 'HIGH', 2, 8, 'Major feature failure or significant operational degradation'),
('Medium Incident SLA', 'MEDIUM', 4, 24, 'Non-critical service impairment or operational defect'),
('Low Incident SLA', 'LOW', 8, 48, 'Minor defect, routine inquiry, or standard hardware request')
ON DUPLICATE KEY UPDATE name=name;

-- 12. Seed Incident Categories
INSERT INTO incident_categories (name, description, sla_hours) VALUES
('Hardware', 'Workstation, laptop, monitor, or peripheral device malfunction', 8),
('Software & OS', 'Operating system, desktop application, or productivity tool crashes', 4),
('Network & VPN', 'Wi-Fi, LAN, firewall, DNS, or VPN connectivity interruptions', 2),
('Security & Access', 'Password resets, account lockouts, permission requests, or security alerts', 1),
('Database & Infrastructure', 'Server downtime, cloud service alerts, or enterprise database issues', 2)
ON DUPLICATE KEY UPDATE name=name;
