-- ============================================================================
-- Flyway Database Migration: V4__administration_and_auditability.sql
-- Description: Administration and Auditability Schema Enhancements
-- Phase 6: Category activation lifecycle, audit query indexing, role-status index
-- ============================================================================

-- 1. Extend incident_categories with active status toggle and updated_at tracking
ALTER TABLE incident_categories 
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. Audit Events query performance indexes for administrative exploration
CREATE INDEX idx_audit_action ON audit_events (action);
CREATE INDEX idx_audit_performed_by ON audit_events (performed_by_id);
CREATE INDEX idx_audit_type_created ON audit_events (entity_type, created_at);

-- 3. User RBAC and active status indexing for admin safeguard counting
CREATE INDEX idx_users_role_active ON users (role_id, is_active);
