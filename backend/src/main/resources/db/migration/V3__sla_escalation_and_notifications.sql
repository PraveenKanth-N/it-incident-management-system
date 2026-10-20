-- ==============================================================================
-- IT Incident Management and Resolution System - Phase 5 Automation & Notifications Schema
-- Migration: V3__sla_escalation_and_notifications.sql
-- Engine: MySQL 8.0 / InnoDB / utf8mb4
-- ==============================================================================

-- 1. Extend Incidents with Escalation and Breach Tracking
ALTER TABLE incidents
    ADD COLUMN escalation_level INT NOT NULL DEFAULT 0 AFTER sla_policy_id,
    ADD COLUMN escalated_at TIMESTAMP NULL AFTER escalation_level,
    ADD COLUMN sla_breached BOOLEAN NOT NULL DEFAULT FALSE AFTER escalated_at;

CREATE INDEX idx_incidents_escalation ON incidents (escalation_level, sla_breached);

-- 2. Escalation Rules Configuration Table
CREATE TABLE IF NOT EXISTS escalation_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL UNIQUE,
    warning_threshold_percent INT NOT NULL DEFAULT 75,
    breach_level INT NOT NULL DEFAULT 2,
    critical_threshold_percent INT NOT NULL DEFAULT 150,
    auto_escalate_unassigned BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id BIGINT NOT NULL,
    incident_id BIGINT NULL,
    type ENUM(
        'INCIDENT_CREATED',
        'INCIDENT_ASSIGNED',
        'INCIDENT_REASSIGNED',
        'STATUS_CHANGED',
        'INCIDENT_RESOLVED',
        'INCIDENT_REOPENED',
        'SLA_WARNING',
        'SLA_BREACHED',
        'ESCALATION_TRIGGERED'
    ) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    channel ENUM('IN_APP', 'EMAIL', 'LOG') NOT NULL DEFAULT 'IN_APP',
    status ENUM('PENDING', 'DELIVERED', 'FAILED', 'PENDING_RETRY') NOT NULL DEFAULT 'DELIVERED',
    delivery_attempts INT NOT NULL DEFAULT 1,
    error_message VARCHAR(500) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    CONSTRAINT fk_notif_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_incident FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE SET NULL,
    INDEX idx_notifications_recipient (recipient_id, is_read, created_at),
    INDEX idx_notifications_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Seed Standard Escalation Rules
INSERT INTO escalation_rules (priority, warning_threshold_percent, breach_level, critical_threshold_percent, auto_escalate_unassigned, is_active)
VALUES
    ('CRITICAL', 75, 2, 150, TRUE, TRUE),
    ('HIGH', 75, 2, 150, TRUE, TRUE),
    ('MEDIUM', 80, 2, 160, TRUE, TRUE),
    ('LOW', 80, 2, 160, FALSE, TRUE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
