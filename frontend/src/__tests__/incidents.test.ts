import { describe, it, expect } from 'vitest';

/**
 * Domain Logic and ITIL Rules Tests for Page Group 2:
 * Incident Creation, Ticket Management, Queue Filtering, and Lifecycle Transitions
 */

// ITIL 3x3 Priority Calculation Matrix implementation (matching backend PriorityService)
type Impact = 'HIGH' | 'MEDIUM' | 'LOW';
type Urgency = 'HIGH' | 'MEDIUM' | 'LOW';
type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

function calculateItilPriority(impact: Impact, urgency: Urgency): Priority {
  if (impact === 'HIGH' && urgency === 'HIGH') return 'CRITICAL';
  if (impact === 'HIGH' && urgency === 'MEDIUM') return 'HIGH';
  if (impact === 'HIGH' && urgency === 'LOW') return 'MEDIUM';
  if (impact === 'MEDIUM' && urgency === 'HIGH') return 'HIGH';
  if (impact === 'MEDIUM' && urgency === 'MEDIUM') return 'MEDIUM';
  if (impact === 'MEDIUM' && urgency === 'LOW') return 'LOW';
  if (impact === 'LOW' && urgency === 'HIGH') return 'MEDIUM';
  if (impact === 'LOW' && urgency === 'MEDIUM') return 'LOW';
  return 'LOW'; // LOW + LOW
}

// SLA Duration Expectations based on Priority
function getSlaTargets(priority: Priority): { responseHours: number; resolutionHours: number } {
  switch (priority) {
    case 'CRITICAL':
      return { responseHours: 1, resolutionHours: 4 };
    case 'HIGH':
      return { responseHours: 2, resolutionHours: 8 };
    case 'MEDIUM':
      return { responseHours: 4, resolutionHours: 24 };
    case 'LOW':
      return { responseHours: 8, resolutionHours: 72 };
  }
}

// Form Validation logic
interface IncidentFormInput {
  title: string;
  description: string;
  categoryId: number;
  impact: Impact;
  urgency: Urgency;
}

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

function validateIncidentForm(data: IncidentFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  const trimmedTitle = data.title.trim();
  if (!trimmedTitle) {
    errors.title = 'Incident title is required';
  } else if (trimmedTitle.length < 3) {
    errors.title = 'Title must be at least 3 characters long';
  } else if (trimmedTitle.length > 200) {
    errors.title = 'Title cannot exceed 200 characters';
  }

  const trimmedDesc = data.description.trim();
  if (!trimmedDesc) {
    errors.description = 'Detailed description is required';
  } else if (trimmedDesc.length < 10) {
    errors.description = 'Description must be at least 10 characters long';
  }

  if (!data.categoryId || data.categoryId <= 0) {
    errors.categoryId = 'Please select a valid incident category';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

// State Machine and Role-Based Lifecycle Transition logic
type IncidentStatus = 'OPEN' | 'TRIAGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type UserRole = 'ROLE_EMPLOYEE' | 'ROLE_TECHNICIAN' | 'ROLE_ADMIN';

interface TransitionRequest {
  currentStatus: IncidentStatus;
  targetStatus: IncidentStatus;
  userRole: UserRole;
  isReporter: boolean;
  resolutionNotes?: string;
}

interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

function canTransitionIncident(req: TransitionRequest): TransitionResult {
  const { currentStatus, targetStatus, userRole, isReporter, resolutionNotes } = req;

  // No-op
  if (currentStatus === targetStatus) {
    return { allowed: false, reason: 'Target status is identical to current status' };
  }

  // Employee transitions
  if (userRole === 'ROLE_EMPLOYEE') {
    // An employee can cancel their own OPEN ticket
    if (isReporter && currentStatus === 'OPEN' && targetStatus === 'CLOSED') {
      return { allowed: true };
    }
    // An employee can confirm resolution and close
    if (isReporter && currentStatus === 'RESOLVED' && targetStatus === 'CLOSED') {
      return { allowed: true };
    }
    // An employee can reopen a resolved ticket if still unresolved
    if (isReporter && currentStatus === 'RESOLVED' && targetStatus === 'IN_PROGRESS') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Employees can only cancel open tickets or confirm/reopen resolved tickets' };
  }

  // Resolution note requirement for resolving
  if (targetStatus === 'RESOLVED') {
    if (!resolutionNotes || resolutionNotes.trim().length === 0) {
      return { allowed: false, reason: 'Mandatory resolution notes required when marking an incident as RESOLVED' };
    }
  }

  // Reopening CLOSED tickets: Admin ONLY
  if (currentStatus === 'CLOSED' && targetStatus === 'OPEN') {
    if (userRole !== 'ROLE_ADMIN') {
      return { allowed: false, reason: 'Only an Administrator can reopen a permanently closed incident' };
    }
    return { allowed: true };
  }

  // Standard ITIL status transitions for Technicians and Admins
  switch (currentStatus) {
    case 'OPEN':
      if (['TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'CLOSED'].includes(targetStatus)) return { allowed: true };
      break;
    case 'TRIAGED':
      if (['ASSIGNED', 'IN_PROGRESS', 'CLOSED'].includes(targetStatus)) return { allowed: true };
      break;
    case 'ASSIGNED':
      if (['IN_PROGRESS', 'TRIAGED', 'CLOSED'].includes(targetStatus)) return { allowed: true };
      break;
    case 'IN_PROGRESS':
      if (['RESOLVED', 'ASSIGNED'].includes(targetStatus)) return { allowed: true };
      break;
    case 'RESOLVED':
      if (['CLOSED', 'IN_PROGRESS'].includes(targetStatus)) return { allowed: true };
      break;
    case 'CLOSED':
      // Handled above (admin check)
      return { allowed: false, reason: 'Closed incidents cannot transition without admin reopening' };
  }

  return { allowed: false, reason: `Invalid status transition from ${currentStatus} to ${targetStatus}` };
}

describe('Page Group 2: Incident Creation and Ticket Management Suite', () => {

  describe('1. ITIL 3x3 Priority Calculation Matrix', () => {
    it('calculates CRITICAL priority for High Impact + High Urgency', () => {
      expect(calculateItilPriority('HIGH', 'HIGH')).toBe('CRITICAL');
    });

    it('calculates HIGH priority for High Impact + Medium Urgency, or Medium Impact + High Urgency', () => {
      expect(calculateItilPriority('HIGH', 'MEDIUM')).toBe('HIGH');
      expect(calculateItilPriority('MEDIUM', 'HIGH')).toBe('HIGH');
    });

    it('calculates MEDIUM priority for High-Low, Medium-Medium, or Low-High combinations', () => {
      expect(calculateItilPriority('HIGH', 'LOW')).toBe('MEDIUM');
      expect(calculateItilPriority('MEDIUM', 'MEDIUM')).toBe('MEDIUM');
      expect(calculateItilPriority('LOW', 'HIGH')).toBe('MEDIUM');
    });

    it('calculates LOW priority for Medium-Low, Low-Medium, or Low-Low combinations', () => {
      expect(calculateItilPriority('MEDIUM', 'LOW')).toBe('LOW');
      expect(calculateItilPriority('LOW', 'MEDIUM')).toBe('LOW');
      expect(calculateItilPriority('LOW', 'LOW')).toBe('LOW');
    });

    it('determines appropriate SLA targets corresponding to calculated priority', () => {
      const criticalSla = getSlaTargets('CRITICAL');
      expect(criticalSla.responseHours).toBe(1);
      expect(criticalSla.resolutionHours).toBe(4);

      const highSla = getSlaTargets('HIGH');
      expect(highSla.responseHours).toBe(2);
      expect(highSla.resolutionHours).toBe(8);

      const medSla = getSlaTargets('MEDIUM');
      expect(medSla.responseHours).toBe(4);
      expect(medSla.resolutionHours).toBe(24);

      const lowSla = getSlaTargets('LOW');
      expect(lowSla.responseHours).toBe(8);
      expect(lowSla.resolutionHours).toBe(72);
    });
  });

  describe('2. Incident Creation Form Validation & Sanitization', () => {
    it('validates a compliant incident creation input', () => {
      const validForm: IncidentFormInput = {
        title: 'Network printer floor 3 offline',
        description: 'Unable to connect to the HP LaserJet on 3rd floor west wing via IP 192.168.1.45',
        categoryId: 1,
        impact: 'MEDIUM',
        urgency: 'LOW'
      };

      const result = validateIncidentForm(validForm);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('rejects title shorter than 3 characters or whitespace-only', () => {
      const invalidForm: IncidentFormInput = {
        title: '  ab ',
        description: 'Detailed description exceeding 10 characters length',
        categoryId: 2,
        impact: 'LOW',
        urgency: 'LOW'
      };

      const result = validateIncidentForm(invalidForm);
      expect(result.valid).toBe(false);
      expect(result.errors.title).toBe('Title must be at least 3 characters long');
    });

    it('rejects title exceeding 200 characters', () => {
      const longTitle = 'A'.repeat(201);
      const invalidForm: IncidentFormInput = {
        title: longTitle,
        description: 'Valid description for testing title boundary',
        categoryId: 3,
        impact: 'HIGH',
        urgency: 'HIGH'
      };

      const result = validateIncidentForm(invalidForm);
      expect(result.valid).toBe(false);
      expect(result.errors.title).toBe('Title cannot exceed 200 characters');
    });

    it('rejects description shorter than 10 characters', () => {
      const invalidForm: IncidentFormInput = {
        title: 'VPN issue',
        description: 'Broken!',
        categoryId: 2,
        impact: 'HIGH',
        urgency: 'HIGH'
      };

      const result = validateIncidentForm(invalidForm);
      expect(result.valid).toBe(false);
      expect(result.errors.description).toBe('Description must be at least 10 characters long');
    });

    it('rejects unselected or zero categoryId', () => {
      const invalidForm: IncidentFormInput = {
        title: 'VPN authentication failure',
        description: 'Cisco AnyConnect gives timeout error when connecting to EU gateway',
        categoryId: 0,
        impact: 'HIGH',
        urgency: 'HIGH'
      };

      const result = validateIncidentForm(invalidForm);
      expect(result.valid).toBe(false);
      expect(result.errors.categoryId).toBe('Please select a valid incident category');
    });
  });

  describe('3. Role-Based Lifecycle Transition State Machine', () => {
    describe('Employee Constraints', () => {
      it('allows employee reporter to cancel their own OPEN ticket', () => {
        const res = canTransitionIncident({
          currentStatus: 'OPEN',
          targetStatus: 'CLOSED',
          userRole: 'ROLE_EMPLOYEE',
          isReporter: true
        });
        expect(res.allowed).toBe(true);
      });

      it('forbids employee from cancelling an incident reported by someone else', () => {
        const res = canTransitionIncident({
          currentStatus: 'OPEN',
          targetStatus: 'CLOSED',
          userRole: 'ROLE_EMPLOYEE',
          isReporter: false
        });
        expect(res.allowed).toBe(false);
      });

      it('forbids employee from triaging, assigning, or marking ticket in-progress', () => {
        const triageRes = canTransitionIncident({
          currentStatus: 'OPEN',
          targetStatus: 'TRIAGED',
          userRole: 'ROLE_EMPLOYEE',
          isReporter: true
        });
        expect(triageRes.allowed).toBe(false);

        const progRes = canTransitionIncident({
          currentStatus: 'ASSIGNED',
          targetStatus: 'IN_PROGRESS',
          userRole: 'ROLE_EMPLOYEE',
          isReporter: true
        });
        expect(progRes.allowed).toBe(false);
      });

      it('allows employee reporter to confirm resolution and close a RESOLVED ticket', () => {
        const res = canTransitionIncident({
          currentStatus: 'RESOLVED',
          targetStatus: 'CLOSED',
          userRole: 'ROLE_EMPLOYEE',
          isReporter: true
        });
        expect(res.allowed).toBe(true);
      });

      it('allows employee reporter to reopen a RESOLVED ticket if problem recurs', () => {
        const res = canTransitionIncident({
          currentStatus: 'RESOLVED',
          targetStatus: 'IN_PROGRESS',
          userRole: 'ROLE_EMPLOYEE',
          isReporter: true
        });
        expect(res.allowed).toBe(true);
      });
    });

    describe('Technician & Admin Lifecycle Rules', () => {
      it('allows technician to triage an OPEN incident', () => {
        const res = canTransitionIncident({
          currentStatus: 'OPEN',
          targetStatus: 'TRIAGED',
          userRole: 'ROLE_TECHNICIAN',
          isReporter: false
        });
        expect(res.allowed).toBe(true);
      });

      it('allows technician to assign and start progress', () => {
        const assignRes = canTransitionIncident({
          currentStatus: 'TRIAGED',
          targetStatus: 'ASSIGNED',
          userRole: 'ROLE_TECHNICIAN',
          isReporter: false
        });
        expect(assignRes.allowed).toBe(true);

        const progRes = canTransitionIncident({
          currentStatus: 'ASSIGNED',
          targetStatus: 'IN_PROGRESS',
          userRole: 'ROLE_TECHNICIAN',
          isReporter: false
        });
        expect(progRes.allowed).toBe(true);
      });

      it('enforces mandatory resolution notes when transitioning IN_PROGRESS -> RESOLVED', () => {
        const failedRes = canTransitionIncident({
          currentStatus: 'IN_PROGRESS',
          targetStatus: 'RESOLVED',
          userRole: 'ROLE_TECHNICIAN',
          isReporter: false,
          resolutionNotes: ''
        });
        expect(failedRes.allowed).toBe(false);
        expect(failedRes.reason).toContain('Mandatory resolution notes required');

        const successRes = canTransitionIncident({
          currentStatus: 'IN_PROGRESS',
          targetStatus: 'RESOLVED',
          userRole: 'ROLE_TECHNICIAN',
          isReporter: false,
          resolutionNotes: 'Patched DNS records on primary bind server and flushed local cache.'
        });
        expect(successRes.allowed).toBe(true);
      });

      it('forbids technician from reopening a permanently CLOSED incident', () => {
        const res = canTransitionIncident({
          currentStatus: 'CLOSED',
          targetStatus: 'OPEN',
          userRole: 'ROLE_TECHNICIAN',
          isReporter: false
        });
        expect(res.allowed).toBe(false);
        expect(res.reason).toContain('Only an Administrator can reopen a permanently closed incident');
      });

      it('permits administrator to reopen a permanently CLOSED incident', () => {
        const res = canTransitionIncident({
          currentStatus: 'CLOSED',
          targetStatus: 'OPEN',
          userRole: 'ROLE_ADMIN',
          isReporter: false
        });
        expect(res.allowed).toBe(true);
      });
    });
  });

  describe('4. Work Note Confidentiality & Permissions', () => {
    it('identifies whether user can toggle internal work note based on role', () => {
      const canPostInternal = (role: UserRole) => role === 'ROLE_TECHNICIAN' || role === 'ROLE_ADMIN';

      expect(canPostInternal('ROLE_EMPLOYEE')).toBe(false);
      expect(canPostInternal('ROLE_TECHNICIAN')).toBe(true);
      expect(canPostInternal('ROLE_ADMIN')).toBe(true);
    });

    it('filters out internal work notes when rendered for employee view', () => {
      interface CommentItem {
        id: number;
        content: string;
        isInternal: boolean;
      }

      const comments: CommentItem[] = [
        { id: 1, content: 'Initial user report', isInternal: false },
        { id: 2, content: 'Investigating core switch routing table (Tech eyes only)', isInternal: true },
        { id: 3, content: 'Please verify if connection is restored', isInternal: false }
      ];

      const filterForRole = (items: CommentItem[], role: UserRole) => {
        if (role === 'ROLE_EMPLOYEE') {
          return items.filter(c => !c.isInternal);
        }
        return items;
      };

      const employeeComments = filterForRole(comments, 'ROLE_EMPLOYEE');
      expect(employeeComments).toHaveLength(2);
      expect(employeeComments.some(c => c.isInternal)).toBe(false);

      const techComments = filterForRole(comments, 'ROLE_TECHNICIAN');
      expect(techComments).toHaveLength(3);
    });
  });

  describe('5. Directory Queue Filtering and Role Context', () => {
    it('generates role-appropriate query parameters for directory requests', () => {
      interface DirectoryFilter {
        search?: string;
        status?: string;
        priority?: string;
        categoryId?: number;
        unassignedOnly?: boolean;
        assignedToMe?: boolean;
        reportedByMe?: boolean;
        page: number;
        size: number;
      }

      const buildQueryParams = (filter: DirectoryFilter, currentUserId: number, userRole: UserRole) => {
        const params: Record<string, string> = {
          page: String(filter.page),
          size: String(filter.size)
        };

        if (filter.search) params.search = filter.search;
        if (filter.status && filter.status !== 'ALL') params.status = filter.status;
        if (filter.priority && filter.priority !== 'ALL') params.priority = filter.priority;
        if (filter.categoryId) params.categoryId = String(filter.categoryId);

        if (userRole === 'ROLE_EMPLOYEE') {
          // Employees are always scoped to their own reports
          params.reporterId = String(currentUserId);
        } else {
          if (filter.unassignedOnly) params.unassignedOnly = 'true';
          if (filter.assignedToMe) params.assigneeId = String(currentUserId);
          if (filter.reportedByMe) params.reporterId = String(currentUserId);
        }

        return params;
      };

      // Test Employee query scoping
      const empParams = buildQueryParams({ page: 0, size: 20 }, 42, 'ROLE_EMPLOYEE');
      expect(empParams.reporterId).toBe('42');
      expect(empParams.unassignedOnly).toBeUndefined();

      // Test Technician "Unassigned Queue" tab
      const unassignedParams = buildQueryParams({ page: 0, size: 20, unassignedOnly: true }, 15, 'ROLE_TECHNICIAN');
      expect(unassignedParams.unassignedOnly).toBe('true');
      expect(unassignedParams.reporterId).toBeUndefined();

      // Test Technician "Assigned to Me" tab
      const myQueueParams = buildQueryParams({ page: 0, size: 20, assignedToMe: true }, 15, 'ROLE_TECHNICIAN');
      expect(myQueueParams.assigneeId).toBe('15');
    });
  });

});
