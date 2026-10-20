-- ==============================================================================
-- IT Incident Management and Resolution System - Core Incident Management Schema Extension
-- Migration: V2__incident_management.sql
-- Engine: MySQL 8.0 / InnoDB / utf8mb4
-- ==============================================================================

-- 1. Extend Incidents Table with Impact, Urgency, and Updated Status Enum
ALTER TABLE incidents
    ADD COLUMN impact ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM' AFTER description,
    ADD COLUMN urgency ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM' AFTER impact,
    MODIFY COLUMN status ENUM('OPEN', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';

-- 2. Update Status History Table to Reflect New Status Lifecycle Enums
ALTER TABLE incident_status_history
    MODIFY COLUMN old_status ENUM('OPEN', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NULL,
    MODIFY COLUMN new_status ENUM('OPEN', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL;

-- 3. Extend Incident Assignments Table with Previous Assignee Tracking
ALTER TABLE incident_assignments
    ADD COLUMN previous_assignee_id BIGINT NULL AFTER assigned_by_id,
    ADD CONSTRAINT fk_assign_prev FOREIGN KEY (previous_assignee_id) REFERENCES users (id) ON DELETE SET NULL;

-- 4. Additional Performance and Foreign Key Indexes
CREATE INDEX idx_incidents_reporter ON incidents (reporter_id);
CREATE INDEX idx_incidents_assignee ON incidents (assignee_id);
CREATE INDEX idx_incidents_category ON incidents (category_id);
CREATE INDEX idx_incidents_created_at ON incidents (created_at);
CREATE INDEX idx_comments_created ON incident_comments (created_at);
