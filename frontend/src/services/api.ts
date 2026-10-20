/**
 * API Service for IT Incident Management & Resolution System
 * Integrates with Spring Boot Backend at /api/v1
 */

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface UserSummaryDto {
  id: number;
  username: string;
  email: string;
  fullName: string;
  department?: string;
  role: 'ROLE_EMPLOYEE' | 'ROLE_TECHNICIAN' | 'ROLE_ADMIN';
  isActive: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresInMs: number;
  user: UserSummaryDto;
}

export interface CategoryDto {
  id: number;
  name: string;
  description?: string;
  slaHours: number;
  isActive: boolean;
}

export interface CategoryPayload {
  name: string;
  description?: string;
  slaHours: number;
  isActive?: boolean;
}

export interface SlaPolicyDto {
  id: number;
  name: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  responseTimeHours: number;
  resolutionTimeHours: number;
  description?: string;
  isActive: boolean;
}

export interface UpdateSlaPolicyPayload {
  responseTimeHours: number;
  resolutionTimeHours: number;
  description?: string;
  isActive?: boolean;
}

export interface AuditEventDto {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  performedByUsername: string;
  performedByFullName: string;
  performedByRole: string;
  previousState?: string | null;
  newState?: string | null;
  ipAddress?: string | null;
  outcome: string;
  createdAt: string;
}

export interface AuditFilterParams {
  search?: string;
  query?: string;
  entityType?: string;
  action?: string;
  username?: string;
  actor?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
}

export interface UserFilterParams {
  search?: string;
  query?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
}

export interface IncidentResponse {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  impact?: 'LOW' | 'MEDIUM' | 'HIGH';
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'TRIAGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'LOGGED' | 'ON_HOLD';
  category: CategoryDto | string;
  reporter?: UserSummaryDto;
  reporterName?: string;
  assignee?: UserSummaryDto | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  slaPolicy?: SlaPolicyDto | null;
  slaHours?: number;
  slaBreached?: boolean;
  escalationLevel?: number;
  escalatedAt?: string | null;
  resolutionNotes?: string | null;
  resolutionSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

// Backward-compatible alias for existing components
export type Incident = IncidentResponse;

export interface IncidentCommentResponse {
  id: number;
  incidentId: number;
  author: UserSummaryDto;
  commentText: string;
  isInternal: boolean;
  createdAt: string;
}

export interface IncidentStatusHistoryResponse {
  id: number;
  oldStatus?: string | null;
  newStatus: string;
  changedBy: UserSummaryDto;
  changeReason: string;
  createdAt: string;
}

export interface IncidentAssignmentResponse {
  id: number;
  assignedBy: UserSummaryDto;
  previousAssignee?: UserSummaryDto | null;
  assignedTo: UserSummaryDto;
  assignmentNotes?: string | null;
  assignedAt: string;
}

export interface IncidentHistoryResponse {
  incidentId: number;
  ticketNumber: string;
  statusHistory: IncidentStatusHistoryResponse[];
  assignmentHistory: IncidentAssignmentResponse[];
  auditEvents: unknown[];
}

export interface CreateIncidentPayload {
  title: string;
  description: string;
  categoryId?: number;
  category?: string; // fallback string for legacy caller
  impact?: 'LOW' | 'MEDIUM' | 'HIGH';
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  slaHours?: number;
}

export interface UpdateIncidentPayload {
  title?: string;
  description?: string;
  categoryId?: number;
  impact?: 'LOW' | 'MEDIUM' | 'HIGH';
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RegisterUserPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
  department?: string;
  role?: string;
}

// -----------------------------------------------------------------------------
// Phase 4 Analytics & Operational Intelligence Interfaces
// -----------------------------------------------------------------------------
export interface SlaMetrics {
  totalEvaluated: number;
  onTimeCount: number;
  breachedCount: number;
  approachingDeadlineCount: number;
  complianceRate: number;
  averageResolutionHours: number;
}

export interface DashboardMetricsResponse {
  totalIncidents: number;
  openCount: number;
  triagedCount: number;
  assignedCount: number;
  inProgressCount: number;
  resolvedCount: number;
  closedCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  criticalAndHighCount: number;
  unassignedCount: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  slaMetrics: SlaMetrics;
}

export interface TrendDataPoint {
  date: string;
  createdCount: number;
  resolvedCount: number;
}

export interface TechnicianWorkload {
  technicianId: number;
  username: string;
  fullName: string;
  department?: string;
  activeAssignedCount: number;
  resolvedCount: number;
  totalAssignedCount: number;
  breachedCount: number;
  slaComplianceRate: number;
  avgResolutionHours: number;
}

export interface AnalyticsFilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  priority?: string;
  categoryId?: number;
  technicianId?: number;
}

const API_BASE = '/api/v1';

// -----------------------------------------------------------------------------
// JWT Storage & Session Management (Safest Compatible Strategy)
// Note: Backend emits JWT in AuthResponse. Default storage uses sessionStorage
// (strictly ephemeral to browser session). localStorage is only used if the user
// explicitly checks 'Remember me on this device', with expiration tracking.
// -----------------------------------------------------------------------------
const TOKEN_KEY = 'resolv_jwt_token';
const USER_KEY = 'resolv_user_profile';
const EXPIRY_KEY = 'resolv_token_expiry';
const REMEMBER_KEY = 'resolv_remember_flag';

export const isRememberMeActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(REMEMBER_KEY) === 'true';
};

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  // Check sessionStorage first (default secure ephemeral store)
  const sessionToken = sessionStorage.getItem(TOKEN_KEY);
  if (sessionToken) return sessionToken;

  // Check localStorage if remember-me was chosen
  if (isRememberMeActive()) {
    if (isTokenExpired()) {
      clearStoredSession();
      return null;
    }
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const getStoredUser = (): UserSummaryDto | null => {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(USER_KEY) || (isRememberMeActive() ? localStorage.getItem(USER_KEY) : null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSummaryDto;
  } catch {
    return null;
  }
};

export const setStoredSession = (
  token: string, 
  user: UserSummaryDto, 
  expiresInMs?: number, 
  rememberMe: boolean = false
): void => {
  if (typeof window === 'undefined') return;

  // Always clear any opposing store first to maintain consistency
  clearStoredSession();

  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(REMEMBER_KEY, 'true');
    if (expiresInMs) {
      const expiresAt = Date.now() + expiresInMs;
      localStorage.setItem(EXPIRY_KEY, expiresAt.toString());
    }
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    if (expiresInMs) {
      const expiresAt = Date.now() + expiresInMs;
      sessionStorage.setItem(EXPIRY_KEY, expiresAt.toString());
    }
  }
};

export const clearStoredSession = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(REMEMBER_KEY);
};

export const isTokenExpired = (): boolean => {
  if (typeof window === 'undefined') return true;
  const expiry = sessionStorage.getItem(EXPIRY_KEY) || localStorage.getItem(EXPIRY_KEY);
  if (!expiry) return false;
  return Date.now() > parseInt(expiry, 10);
};

// Central event emitter for session expiration
type AuthListener = () => void;
const authListeners: AuthListener[] = [];
export const onUnauthorized = (listener: AuthListener) => {
  authListeners.push(listener);
  return () => {
    const idx = authListeners.indexOf(listener);
    if (idx >= 0) authListeners.splice(idx, 1);
  };
};

const notifyUnauthorized = () => {
  clearStoredSession();
  authListeners.forEach(fn => fn());
};

// -----------------------------------------------------------------------------
// Centralized Authenticated Fetch Wrapper
// -----------------------------------------------------------------------------
async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkErr: unknown) {
    const msg = networkErr instanceof Error ? networkErr.message : 'Network unreachable';
    throw new Error(`Cannot connect to backend server at ${url}: ${msg}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const errObj = json as { message?: string; error?: string; validationErrors?: Record<string, string> } | null;

  if (res.status === 401) {
    if (token) {
      notifyUnauthorized();
    }
    const errorMsg = errObj?.message || (token ? 'Authentication expired or invalid. Please sign in again.' : 'Invalid username or password');
    throw new Error(errorMsg);
  }

  if (res.status === 403) {
    throw new Error(errObj?.message || 'Access denied: You do not have permission to perform this action.');
  }

  if (!res.ok) {
    let errorMsg = errObj?.message || errObj?.error || `Request failed with HTTP ${res.status}`;
    if (errObj?.validationErrors) {
      const fieldDetails = Object.entries(errObj.validationErrors).map(([k, v]) => `${k}: ${v}`).join(', ');
      errorMsg = `${errorMsg} (${fieldDetails})`;
    }
    const error = new Error(errorMsg);
    (error as unknown as { validationErrors?: Record<string, string> }).validationErrors = errObj?.validationErrors;
    throw error;
  }

  // Handle ApiResponse<T> wrapper
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return (json as ApiResponse<T>).data;
  }

  return json as T;
}

// -----------------------------------------------------------------------------
// Authentication API
// -----------------------------------------------------------------------------
export const authApi = {
  async login(credentials: { username: string; password: string; rememberMe?: boolean }): Promise<AuthResponse> {
    const { rememberMe = false, ...body } = credentials;
    const data = await fetchWithAuth<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    setStoredSession(data.token, data.user, data.expiresInMs, rememberMe);
    return data;
  },

  async register(payload: RegisterUserPayload, rememberMe: boolean = false): Promise<AuthResponse> {
    const data = await fetchWithAuth<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setStoredSession(data.token, data.user, data.expiresInMs, rememberMe);
    return data;
  },

  async getCurrentUser(): Promise<UserSummaryDto> {
    return fetchWithAuth<UserSummaryDto>('/users/me');
  },

  async getAllUsers(params?: UserFilterParams | number, maybeSize = 20): Promise<PagedResponse<UserSummaryDto>> {
    if (typeof params === 'number') {
      return fetchWithAuth<PagedResponse<UserSummaryDto>>(`/users?page=${params}&size=${maybeSize}`);
    }
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', params.page.toString());
    if (params?.size !== undefined) query.set('size', params.size.toString());
    const searchVal = params?.search || params?.query;
    if (searchVal) {
      query.set('search', searchVal.trim());
      query.set('query', searchVal.trim());
    }
    if (params?.role && params.role !== 'ALL') query.set('role', params.role);
    if (params?.department && params.department !== 'ALL') query.set('department', params.department);
    if (params?.isActive !== undefined) query.set('isActive', params.isActive.toString());
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.direction) query.set('direction', params.direction);
    const qs = query.toString();
    return fetchWithAuth<PagedResponse<UserSummaryDto>>(`/users${qs ? `?${qs}` : ''}`);
  },

  async getUsers(params?: UserFilterParams | number, maybeSize = 20): Promise<PagedResponse<UserSummaryDto>> {
    return this.getAllUsers(params, maybeSize);
  },

  async updateUserStatus(id: number, isActive: boolean): Promise<UserSummaryDto> {
    return fetchWithAuth<UserSummaryDto>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
  },

  async updateUserRole(id: number, role: string): Promise<UserSummaryDto> {
    return fetchWithAuth<UserSummaryDto>(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  },

  async createUserByAdmin(payload: RegisterUserPayload): Promise<UserSummaryDto> {
    return fetchWithAuth<UserSummaryDto>('/users/admin', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

// -----------------------------------------------------------------------------
// Incident Management API
// -----------------------------------------------------------------------------
export const incidentApi = {
  // Category mapping helper
  resolveCategoryId(categoryName?: string): number {
    switch (categoryName?.toUpperCase()) {
      case 'HARDWARE': return 1;
      case 'SOFTWARE':
      case 'SOFTWARE & OS': return 2;
      case 'NETWORK':
      case 'NETWORK & VPN': return 3;
      case 'SECURITY':
      case 'SECURITY & ACCESS': return 4;
      case 'DATABASE':
      case 'DATABASE & INFRASTRUCTURE': return 5;
      default: return 3; // Default to Network
    }
  },

  async getCategories(includeInactive = false): Promise<CategoryDto[]> {
    return fetchWithAuth<CategoryDto[]>(`/incidents/categories?includeInactive=${includeInactive}`);
  },

  async getAllCategoriesAdmin(): Promise<CategoryDto[]> {
    return this.getCategories(true);
  },

  async createCategory(payload: CategoryPayload): Promise<CategoryDto> {
    return fetchWithAuth<CategoryDto>('/incidents/categories', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateCategory(id: number, payload: CategoryPayload): Promise<CategoryDto> {
    return fetchWithAuth<CategoryDto>(`/incidents/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async toggleCategoryStatus(id: number, _isActive?: boolean): Promise<CategoryDto> {
    return fetchWithAuth<CategoryDto>(`/incidents/categories/${id}/toggle-status`, {
      method: 'PATCH'
    });
  },

  async getSlaPolicies(): Promise<SlaPolicyDto[]> {
    return fetchWithAuth<SlaPolicyDto[]>('/incidents/sla-policies');
  },

  async updateSlaPolicy(priorityOrId: string | number, payload: UpdateSlaPolicyPayload): Promise<SlaPolicyDto> {
    const priority = typeof priorityOrId === 'string' ? priorityOrId : 
      (priorityOrId === 1 ? 'CRITICAL' : priorityOrId === 2 ? 'HIGH' : priorityOrId === 3 ? 'MEDIUM' : 'LOW');
    return fetchWithAuth<SlaPolicyDto>(`/incidents/sla-policies/${priority}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async getIncidents(params?: {
    page?: number;
    size?: number;
    status?: string;
    priority?: string;
    categoryId?: number;
    search?: string;
    reporterId?: number;
    assigneeId?: number;
    sortBy?: string;
    direction?: 'ASC' | 'DESC';
  }): Promise<PagedResponse<IncidentResponse>> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', params.page.toString());
    if (params?.size !== undefined) query.set('size', params.size.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.categoryId) query.set('categoryId', params.categoryId.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.reporterId) query.set('reporterId', params.reporterId.toString());
    if (params?.assigneeId) query.set('assigneeId', params.assigneeId.toString());
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.direction) query.set('direction', params.direction);

    return fetchWithAuth<PagedResponse<IncidentResponse>>(`/incidents?${query.toString()}`);
  },

  async getIncidentById(id: number): Promise<IncidentResponse> {
    return fetchWithAuth<IncidentResponse>(`/incidents/${id}`);
  },

  async createIncident(payload: CreateIncidentPayload): Promise<IncidentResponse> {
    // Map category name to categoryId if needed
    const categoryId = payload.categoryId || incidentApi.resolveCategoryId(payload.category);
    const impact = payload.impact || (payload.priority === 'CRITICAL' ? 'HIGH' : payload.priority === 'HIGH' ? 'HIGH' : 'MEDIUM');
    const urgency = payload.urgency || (payload.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM');

    const backendPayload = {
      title: payload.title.trim(),
      description: payload.description.trim(),
      categoryId,
      impact,
      urgency,
      priority: payload.priority
    };

    return fetchWithAuth<IncidentResponse>('/incidents', {
      method: 'POST',
      body: JSON.stringify(backendPayload)
    });
  },

  async updateIncident(id: number, payload: UpdateIncidentPayload): Promise<IncidentResponse> {
    return fetchWithAuth<IncidentResponse>(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async updateStatus(
    id: number, 
    status: string, 
    reason?: string, 
    resolutionNotes?: string
  ): Promise<IncidentResponse> {
    return fetchWithAuth<IncidentResponse>(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        reason: reason || `Status updated to ${status}`,
        resolutionNotes
      })
    });
  },

  async assignTechnician(id: number, assigneeId: number, notes?: string): Promise<IncidentResponse> {
    return fetchWithAuth<IncidentResponse>(`/incidents/${id}/assignment`, {
      method: 'PATCH',
      body: JSON.stringify({
        assigneeId,
        notes: notes || 'Assigned via Technician Workbench'
      })
    });
  },

  async getIncidentHistory(id: number): Promise<IncidentHistoryResponse> {
    return fetchWithAuth<IncidentHistoryResponse>(`/incidents/${id}/history`);
  },

  async getIncidentComments(id: number): Promise<IncidentCommentResponse[]> {
    return fetchWithAuth<IncidentCommentResponse[]>(`/incidents/${id}/comments`);
  },

  async addComment(id: number, commentText: string, isInternal = false): Promise<IncidentCommentResponse> {
    return fetchWithAuth<IncidentCommentResponse>(`/incidents/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        commentText: commentText.trim(),
        isInternal
      })
    });
  },

  async checkHealth(): Promise<{ status: string; service: string; version: string }> {
    return fetchWithAuth<{ status: string; service: string; version: string }>('/health');
  }
};

// -----------------------------------------------------------------------------
// Phase 4 Analytics & Reporting Service
// -----------------------------------------------------------------------------
export const analyticsApi = {
  buildFilterQuery(params?: AnalyticsFilterParams): URLSearchParams {
    const query = new URLSearchParams();
    if (!params) return query;
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.priority && params.priority !== 'ALL') query.set('priority', params.priority);
    if (params.categoryId !== undefined && params.categoryId !== null) query.set('categoryId', params.categoryId.toString());
    if (params.technicianId !== undefined && params.technicianId !== null) query.set('technicianId', params.technicianId.toString());
    return query;
  },

  async getDashboard(params?: AnalyticsFilterParams): Promise<DashboardMetricsResponse> {
    const q = this.buildFilterQuery(params).toString();
    const endpoint = `/analytics/dashboard${q ? `?${q}` : ''}`;
    return fetchWithAuth<DashboardMetricsResponse>(endpoint);
  },

  async getTrends(params?: AnalyticsFilterParams): Promise<TrendDataPoint[]> {
    const q = this.buildFilterQuery(params).toString();
    const endpoint = `/analytics/trends${q ? `?${q}` : ''}`;
    return fetchWithAuth<TrendDataPoint[]>(endpoint);
  },

  async getTechnicianWorkloads(params?: AnalyticsFilterParams): Promise<TechnicianWorkload[]> {
    const q = this.buildFilterQuery(params).toString();
    const endpoint = `/analytics/technicians${q ? `?${q}` : ''}`;
    return fetchWithAuth<TechnicianWorkload[]>(endpoint);
  },

  async exportCsv(params?: AnalyticsFilterParams): Promise<Blob> {
    const q = this.buildFilterQuery(params).toString();
    const endpoint = `${API_BASE}/analytics/export/csv${q ? `?${q}` : ''}`;
    const token = getStoredToken();
    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(endpoint, {
      method: 'GET',
      headers
    });

    if (!res.ok) {
      throw new Error(`CSV export failed with HTTP ${res.status}`);
    }

    return res.blob();
  },

  async downloadCsv(params?: AnalyticsFilterParams, filename = 'resolv_incidents_report.csv'): Promise<void> {
    const blob = await this.exportCsv(params);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};

// -----------------------------------------------------------------------------
// Phase 5 Notification & Automation Types & APIs
// -----------------------------------------------------------------------------
export interface NotificationResponse {
  id: number;
  recipientId: number;
  incidentId?: number | null;
  ticketNumber?: string | null;
  type:
    | 'INCIDENT_CREATED'
    | 'INCIDENT_ASSIGNED'
    | 'INCIDENT_REASSIGNED'
    | 'STATUS_CHANGED'
    | 'INCIDENT_RESOLVED'
    | 'INCIDENT_REOPENED'
    | 'SLA_WARNING'
    | 'SLA_BREACHED'
    | 'ESCALATION_TRIGGERED';
  title: string;
  message: string;
  channel: 'IN_APP' | 'EMAIL' | 'LOG';
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'PENDING_RETRY';
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface EscalationRuleDto {
  id: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  warningThresholdPercent: number;
  breachLevel: number;
  criticalThresholdPercent: number;
  autoEscalateUnassigned: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateEscalationRulePayload {
  warningThresholdPercent?: number;
  breachLevel?: number;
  criticalThresholdPercent?: number;
  autoEscalateUnassigned?: boolean;
  isActive?: boolean;
}

export interface EscalationScanResultDto {
  scanTimestamp: string;
  totalIncidentsEvaluated: number;
  warningsTriggered: number;
  breachesTriggered: number;
  criticalEscalationsTriggered: number;
  notificationsDispatched: number;
  escalatedTickets: string[];
}

export const notificationApi = {
  async getNotifications(page = 0, size = 20): Promise<PagedResponse<NotificationResponse>> {
    return fetchWithAuth<PagedResponse<NotificationResponse>>(`/notifications?page=${page}&size=${size}`);
  },

  async getRecentNotifications(): Promise<NotificationResponse[]> {
    return fetchWithAuth<NotificationResponse[]>('/notifications/recent');
  },

  async getUnreadCount(): Promise<number> {
    const res = await fetchWithAuth<{ unreadCount: number }>('/notifications/unread-count');
    return res.unreadCount;
  },

  async markAsRead(id: number): Promise<NotificationResponse> {
    return fetchWithAuth<NotificationResponse>(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  },

  async markAllAsRead(): Promise<number> {
    const res = await fetchWithAuth<{ markedCount: number }>('/notifications/mark-all-read', {
      method: 'POST'
    });
    return res.markedCount;
  }
};

export const automationApi = {
  async getEscalationRules(): Promise<EscalationRuleDto[]> {
    return fetchWithAuth<EscalationRuleDto[]>('/automation/escalation/rules');
  },

  async updateEscalationRule(priority: string, payload: UpdateEscalationRulePayload): Promise<EscalationRuleDto> {
    return fetchWithAuth<EscalationRuleDto>(`/automation/escalation/rules/${priority}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async triggerEscalationScan(): Promise<EscalationScanResultDto> {
    return fetchWithAuth<EscalationScanResultDto>('/automation/escalation/run', {
      method: 'POST'
    });
  },

  async retryFailedNotifications(): Promise<number> {
    const res = await fetchWithAuth<{ retriedCount: number }>('/automation/notifications/retry', {
      method: 'POST'
    });
    return res.retriedCount;
  }
};

export const auditApi = {
  async getAuditEvents(params?: AuditFilterParams): Promise<PagedResponse<AuditEventDto>> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', params.page.toString());
    if (params?.size !== undefined) query.set('size', params.size.toString());
    const searchVal = params?.search || params?.query;
    if (searchVal) query.set('search', searchVal.trim());
    if (params?.entityType && params.entityType !== 'ALL') query.set('entityType', params.entityType);
    if (params?.action && params.action !== 'ALL') query.set('action', params.action);
    const userVal = params?.username || params?.actor;
    if (userVal) {
      query.set('username', userVal.trim());
      query.set('actor', userVal.trim());
    }
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.direction) query.set('direction', params.direction);
    const qs = query.toString();
    return fetchWithAuth<PagedResponse<AuditEventDto>>(`/audit${qs ? `?${qs}` : ''}`);
  },

  async getEntityTypes(): Promise<string[]> {
    return fetchWithAuth<string[]>('/audit/entity-types');
  },

  async getActions(): Promise<string[]> {
    return fetchWithAuth<string[]>('/audit/actions');
  }
};


