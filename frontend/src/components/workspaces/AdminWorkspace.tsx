import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  authApi, 
  incidentApi, 
  automationApi,
  auditApi,
  type UserSummaryDto, 
  type IncidentResponse,
  type RegisterUserPayload,
  type EscalationRuleDto,
  type EscalationScanResultDto,
  type CategoryDto,
  type SlaPolicyDto,
  type AuditEventDto
} from '../../services/api';
import { IncidentDetailModal } from '../incident/IncidentDetailModal';

export const AdminWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'USERS' | 'CONFIG' | 'AUTOMATION' | 'AUDIT'>(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t === 'USERS' || t === 'CONFIG' || t === 'AUTOMATION' || t === 'AUDIT' || t === 'TELEMETRY') {
        if (t === 'TELEMETRY') return 'CONFIG';
        return t as 'INCIDENTS' | 'USERS' | 'CONFIG' | 'AUTOMATION' | 'AUDIT';
      }
    }
    return 'INCIDENTS';
  });

  // ==========================================
  // Incidents State (Tab 1)
  // ==========================================
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IncidentResponse | null>(null);

  // ==========================================
  // Users Directory & RBAC State (Tab 2)
  // ==========================================
  const [users, setUsers] = useState<UserSummaryDto[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userPage, setUserPage] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalElements, setUserTotalElements] = useState(0);

  // User Actions Modal State (Deactivate / Role Update)
  const [actionUser, setActionUser] = useState<UserSummaryDto | null>(null);
  const [actionType, setActionType] = useState<'DEACTIVATE' | 'ACTIVATE' | 'CHANGE_ROLE' | null>(null);
  const [targetRole, setTargetRole] = useState<'ROLE_EMPLOYEE' | 'ROLE_TECHNICIAN' | 'ROLE_ADMIN'>('ROLE_TECHNICIAN');
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionModalError, setActionModalError] = useState<string | null>(null);

  // Create User Modal state
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<RegisterUserPayload>({
    username: '',
    email: '',
    password: '',
    fullName: '',
    department: '',
    role: 'ROLE_TECHNICIAN'
  });
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // ==========================================
  // Incident Configuration State (Tab 3: Categories & SLA Policies)
  // ==========================================
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);

  const [slaPolicies, setSlaPolicies] = useState<SlaPolicyDto[]>([]);
  const [isLoadingSla, setIsLoadingSla] = useState(false);
  const [slaError, setSlaError] = useState<string | null>(null);
  const [slaSuccess, setSlaSuccess] = useState<string | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    slaHours: 24,
    isActive: true
  });
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // SLA Policy Modal State
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicyDto | null>(null);
  const [slaForm, setSlaForm] = useState({
    responseTimeHours: 1,
    resolutionTimeHours: 4,
    description: '',
    isActive: true
  });
  const [slaFormError, setSlaFormError] = useState<string | null>(null);
  const [isSavingSla, setIsSavingSla] = useState(false);

  // ==========================================
  // SLA Escalation & Automation State (Tab 4)
  // ==========================================
  const [escalationRules, setEscalationRules] = useState<EscalationRuleDto[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [scanResult, setScanResult] = useState<EscalationScanResultDto | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<EscalationRuleDto | null>(null);
  const [updateRuleSuccess, setUpdateRuleSuccess] = useState<string | null>(null);
  const [updateRuleError, setUpdateRuleError] = useState<string | null>(null);
  const [retryResult, setRetryResult] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // ==========================================
  // Audit Log Explorer State (Tab 5)
  // ==========================================
  const [auditEvents, setAuditEvents] = useState<AuditEventDto[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityType, setAuditEntityType] = useState('ALL');
  const [auditAction, setAuditAction] = useState('ALL');
  const [auditUsername, setAuditUsername] = useState('');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotalElements, setAuditTotalElements] = useState(0);
  const [availableEntityTypes, setAvailableEntityTypes] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<AuditEventDto | null>(null);

  // ==========================================
  // Fetch Functions
  // ==========================================
  const fetchAllIncidents = useCallback(async () => {
    setIsLoadingIncidents(true);
    try {
      const data = await incidentApi.getIncidents({ page: 0, size: 50, sortBy: 'createdAt', direction: 'DESC' });
      setIncidents(data.content || []);
    } catch {
      setIncidents([]);
    } finally {
      setIsLoadingIncidents(false);
    }
  }, []);

  const fetchUsers = useCallback(async (pageToLoad = userPage) => {
    setIsLoadingUsers(true);
    setUserError(null);
    try {
      const activeFilter = userStatusFilter === 'ALL' ? undefined : userStatusFilter === 'true';
      const data = await authApi.getAllUsers({
        page: pageToLoad,
        size: 15,
        search: userSearch || undefined,
        role: userRoleFilter !== 'ALL' ? userRoleFilter : undefined,
        isActive: activeFilter,
        sortBy: 'id',
        direction: 'ASC'
      });
      setUsers(data.content || []);
      setUserTotalPages(data.totalPages || 1);
      setUserTotalElements(data.totalElements || 0);
      setUserPage(data.page || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch user directory';
      setUserError(msg);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [userPage, userSearch, userRoleFilter, userStatusFilter]);

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoryError(null);
    try {
      const data = await incidentApi.getCategories(true);
      setCategories(data || []);
    } catch (err: unknown) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  const fetchSlaPolicies = useCallback(async () => {
    setIsLoadingSla(true);
    setSlaError(null);
    try {
      const data = await incidentApi.getSlaPolicies();
      setSlaPolicies(data || []);
    } catch (err: unknown) {
      setSlaError(err instanceof Error ? err.message : 'Failed to load SLA policies');
    } finally {
      setIsLoadingSla(false);
    }
  }, []);

  const fetchEscalationRules = useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const data = await automationApi.getEscalationRules();
      setEscalationRules(data || []);
    } catch (err: unknown) {
      console.error('Failed to load escalation rules', err);
    } finally {
      setIsLoadingRules(false);
    }
  }, []);

  const fetchAuditEvents = useCallback(async (pageToLoad = auditPage) => {
    setIsLoadingAudit(true);
    setAuditError(null);
    try {
      let startIso: string | undefined;
      let endIso: string | undefined;
      if (auditStartDate) {
        startIso = new Date(auditStartDate).toISOString();
      }
      if (auditEndDate) {
        endIso = new Date(auditEndDate + 'T23:59:59').toISOString();
      }

      const data = await auditApi.getAuditEvents({
        page: pageToLoad,
        size: 15,
        search: auditSearch || undefined,
        entityType: auditEntityType !== 'ALL' ? auditEntityType : undefined,
        action: auditAction !== 'ALL' ? auditAction : undefined,
        username: auditUsername || undefined,
        startDate: startIso,
        endDate: endIso,
        sortBy: 'createdAt',
        direction: 'DESC'
      });

      setAuditEvents(data.content || []);
      setAuditTotalPages(data.totalPages || 1);
      setAuditTotalElements(data.totalElements || 0);
      setAuditPage(data.page || 0);
    } catch (err: unknown) {
      setAuditError(err instanceof Error ? err.message : 'Failed to load audit history');
      setAuditEvents([]);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [auditPage, auditSearch, auditEntityType, auditAction, auditUsername, auditStartDate, auditEndDate]);

  const fetchAuditMetadata = useCallback(async () => {
    try {
      const [entities, acts] = await Promise.all([
        auditApi.getEntityTypes(),
        auditApi.getActions()
      ]);
      setAvailableEntityTypes(entities || []);
      setAvailableActions(acts || []);
    } catch (err) {
      console.error('Failed to load audit filter metadata', err);
    }
  }, []);

  // Initial tab loading
  useEffect(() => {
    fetchAllIncidents();
  }, [fetchAllIncidents]);

  useEffect(() => {
    if (activeTab === 'USERS') {
      fetchUsers(0);
    } else if (activeTab === 'CONFIG') {
      fetchCategories();
      fetchSlaPolicies();
    } else if (activeTab === 'AUTOMATION') {
      fetchEscalationRules();
    } else if (activeTab === 'AUDIT') {
      fetchAuditEvents(0);
      fetchAuditMetadata();
    }
  }, [activeTab, fetchUsers, fetchCategories, fetchSlaPolicies, fetchEscalationRules, fetchAuditEvents, fetchAuditMetadata]);

  // ==========================================
  // User Actions Handlers
  // ==========================================
  const handleOpenActionModal = (targetUser: UserSummaryDto, type: 'DEACTIVATE' | 'ACTIVATE' | 'CHANGE_ROLE') => {
    setActionUser(targetUser);
    setActionType(type);
    setTargetRole(targetUser.role as 'ROLE_EMPLOYEE' | 'ROLE_TECHNICIAN' | 'ROLE_ADMIN');
    setActionModalError(null);
  };

  const handleExecuteUserAction = async () => {
    if (!actionUser || !actionType) return;
    setIsExecutingAction(true);
    setActionModalError(null);

    try {
      if (actionType === 'DEACTIVATE' || actionType === 'ACTIVATE') {
        const nextStatus = actionType === 'ACTIVATE';
        await authApi.updateUserStatus(actionUser.id, nextStatus);
        setUserSuccess(`User @${actionUser.username} ${nextStatus ? 'activated' : 'deactivated'} successfully.`);
      } else if (actionType === 'CHANGE_ROLE') {
        await authApi.updateUserRole(actionUser.id, targetRole);
        setUserSuccess(`User @${actionUser.username} role updated to ${targetRole}.`);
      }
      setActionUser(null);
      setActionType(null);
      fetchUsers(userPage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setActionModalError(msg);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    setCreateUserSuccess(null);

    if (!newUser.username.trim() || !newUser.email.trim() || !newUser.password || !newUser.fullName.trim()) {
      setCreateUserError('All marked user profile fields are mandatory.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const created = await authApi.createUserByAdmin(newUser);
      setCreateUserSuccess(`User @${created.username} created successfully with role ${created.role}.`);
      setNewUser({
        username: '',
        email: '',
        password: '',
        fullName: '',
        department: '',
        role: 'ROLE_TECHNICIAN'
      });
      fetchUsers(0);
      setTimeout(() => {
        setIsCreateUserOpen(false);
        setCreateUserSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'User creation failed';
      setCreateUserError(msg);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // ==========================================
  // Category & SLA Actions Handlers
  // ==========================================
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      slaHours: 24,
      isActive: true
    });
    setCategoryFormError(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryDto) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      slaHours: cat.slaHours,
      isActive: cat.isActive
    });
    setCategoryFormError(null);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setCategoryFormError('Category name is required.');
      return;
    }
    if (categoryForm.slaHours < 1) {
      setCategoryFormError('SLA hours must be at least 1.');
      return;
    }

    setIsSavingCategory(true);
    setCategoryFormError(null);

    try {
      if (editingCategory) {
        await incidentApi.updateCategory(editingCategory.id, categoryForm);
        setCategorySuccess(`Category "${categoryForm.name}" updated successfully.`);
      } else {
        await incidentApi.createCategory(categoryForm);
        setCategorySuccess(`Category "${categoryForm.name}" created successfully.`);
      }
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      setCategoryFormError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleToggleCategoryStatus = async (cat: CategoryDto) => {
    try {
      await incidentApi.toggleCategoryStatus(cat.id);
      setCategorySuccess(`Category "${cat.name}" status toggled.`);
      fetchCategories();
    } catch (err: unknown) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const handleOpenEditPolicy = (policy: SlaPolicyDto) => {
    setEditingPolicy(policy);
    setSlaForm({
      responseTimeHours: policy.responseTimeHours,
      resolutionTimeHours: policy.resolutionTimeHours,
      description: policy.description || '',
      isActive: policy.isActive
    });
    setSlaFormError(null);
  };

  const handleSaveSlaPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;

    if (slaForm.resolutionTimeHours < slaForm.responseTimeHours) {
      setSlaFormError(`Resolution target (${slaForm.resolutionTimeHours}h) cannot be shorter than response target (${slaForm.responseTimeHours}h).`);
      return;
    }

    setIsSavingSla(true);
    setSlaFormError(null);

    try {
      await incidentApi.updateSlaPolicy(editingPolicy.priority, slaForm);
      setSlaSuccess(`SLA policy for ${editingPolicy.priority} updated successfully.`);
      setEditingPolicy(null);
      fetchSlaPolicies();
    } catch (err: unknown) {
      setSlaFormError(err instanceof Error ? err.message : 'Failed to update SLA policy');
    } finally {
      setIsSavingSla(false);
    }
  };

  // ==========================================
  // Automation Handlers (Tab 4)
  // ==========================================
  const handleTriggerScan = async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      const res = await automationApi.triggerEscalationScan();
      setScanResult(res);
      fetchAllIncidents();
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : 'SLA Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRetryDeliveries = async () => {
    setIsRetrying(true);
    setRetryResult(null);
    try {
      const count = await automationApi.retryFailedNotifications();
      setRetryResult(`Retry queue executed: ${count} pending notification(s) successfully redelivered.`);
    } catch (err: unknown) {
      setRetryResult(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    setUpdateRuleError(null);
    setUpdateRuleSuccess(null);
    try {
      await automationApi.updateEscalationRule(editingRule.priority, {
        warningThresholdPercent: Number(editingRule.warningThresholdPercent),
        breachLevel: Number(editingRule.breachLevel),
        criticalThresholdPercent: Number(editingRule.criticalThresholdPercent),
        autoEscalateUnassigned: editingRule.autoEscalateUnassigned,
        isActive: editingRule.isActive
      });
      setUpdateRuleSuccess(`Rule for ${editingRule.priority} updated successfully.`);
      setEditingRule(null);
      fetchEscalationRules();
    } catch (err: unknown) {
      setUpdateRuleError(err instanceof Error ? err.message : 'Failed to update rule');
    }
  };

  // Helper styles
  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return { bg: 'rgba(255, 65, 108, 0.15)', color: '#ff9a8b', border: 'rgba(255, 65, 108, 0.4)' };
      case 'ROLE_TECHNICIAN':
        return { bg: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', border: 'rgba(0, 242, 254, 0.4)' };
      case 'ROLE_EMPLOYEE': default:
        return { bg: 'rgba(96, 239, 160, 0.15)', color: '#60efa0', border: 'rgba(96, 239, 160, 0.4)' };
    }
  };

  const getOutcomeBadgeStyle = (outcome: string) => {
    switch (outcome) {
      case 'SUCCESS':
        return { bg: 'rgba(0, 255, 135, 0.15)', color: '#00ff87', border: 'rgba(0, 255, 135, 0.35)' };
      case 'FLAGGED':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' };
      case 'FAILURE': default:
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.35)' };
    }
  };

  return (
    <div 
      style={{
        backgroundColor: '#000000',
        minHeight: 'calc(100vh - 76px)',
        color: '#ffffff',
        padding: '36px 36px 64px 36px',
        maxWidth: '1440px',
        margin: '0 auto'
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '32px'
        }}
      >
        <div>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              color: '#ff416c',
              backgroundColor: 'rgba(255, 65, 108, 0.1)',
              padding: '4px 10px',
              borderRadius: '9999px',
              letterSpacing: '0.12em',
              marginBottom: '10px'
            }}
          >
            <span>●</span> EXECUTIVE IT COMMAND &amp; GOVERNANCE
          </div>
          <h1 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              margin: '0 0 8px 0'
            }}
          >
            Administrator Command Center
          </h1>
          <p 
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: '#94a3b8',
              margin: 0
            }}
          >
            Logged in as <strong style={{ color: '#ffffff' }}>@{user?.username}</strong> ({user?.fullName || 'Root Administrator'}). Complete administration, incident configuration, and immutable auditability.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/analytics"
            style={{
              textDecoration: 'none',
              backgroundColor: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              color: '#00f2fe',
              padding: '11px 20px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '15px' }}>📊</span>
            <span>Analytics &amp; KPI Hub</span>
          </Link>

          {activeTab === 'USERS' && (
            <button
              id="btn-provision-user"
              onClick={() => setIsCreateUserOpen(true)}
              className="btn-pill btn-pill-amber-pink"
              style={{ padding: '12px 24px', fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>+ Provision System User</span>
            </button>
          )}

          {activeTab === 'CONFIG' && (
            <button
              id="btn-add-category"
              onClick={handleOpenCreateCategory}
              className="btn-pill btn-pill-amber-pink"
              style={{ padding: '12px 24px', fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>+ Add Incident Category</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div 
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '16px',
          marginBottom: '32px',
          overflowX: 'auto'
        }}
      >
        <button
          id="tab-admin-incidents"
          onClick={() => setActiveTab('INCIDENTS')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'INCIDENTS' ? '#38bdf8' : '#94a3b8',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '6px 12px',
            position: 'relative',
            whiteSpace: 'nowrap'
          }}
        >
          <span>Global Incident Oversight</span>
          {activeTab === 'INCIDENTS' && (
            <div style={{ position: 'absolute', bottom: '-17px', left: 0, right: 0, height: '2px', backgroundColor: '#38bdf8' }} />
          )}
        </button>

        <button
          id="tab-admin-users"
          onClick={() => setActiveTab('USERS')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'USERS' ? '#38bdf8' : '#94a3b8',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '6px 12px',
            position: 'relative',
            whiteSpace: 'nowrap'
          }}
        >
          <span>User Directory &amp; RBAC</span>
          {activeTab === 'USERS' && (
            <div style={{ position: 'absolute', bottom: '-17px', left: 0, right: 0, height: '2px', backgroundColor: '#38bdf8' }} />
          )}
        </button>

        <button
          id="tab-admin-config"
          onClick={() => setActiveTab('CONFIG')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'CONFIG' ? '#38bdf8' : '#94a3b8',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '6px 12px',
            position: 'relative',
            whiteSpace: 'nowrap'
          }}
        >
          <span>Incident Configuration &amp; SLA</span>
          {activeTab === 'CONFIG' && (
            <div style={{ position: 'absolute', bottom: '-17px', left: 0, right: 0, height: '2px', backgroundColor: '#38bdf8' }} />
          )}
        </button>

        <button
          id="tab-admin-automation"
          onClick={() => setActiveTab('AUTOMATION')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'AUTOMATION' ? '#38bdf8' : '#94a3b8',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '6px 12px',
            position: 'relative',
            whiteSpace: 'nowrap'
          }}
        >
          <span>SLA Escalation &amp; Automation</span>
          {activeTab === 'AUTOMATION' && (
            <div style={{ position: 'absolute', bottom: '-17px', left: 0, right: 0, height: '2px', backgroundColor: '#38bdf8' }} />
          )}
        </button>

        <button
          id="tab-admin-audit"
          onClick={() => setActiveTab('AUDIT')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'AUDIT' ? '#38bdf8' : '#94a3b8',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '6px 12px',
            position: 'relative',
            whiteSpace: 'nowrap'
          }}
        >
          <span>Audit Log Explorer</span>
          {activeTab === 'AUDIT' && (
            <div style={{ position: 'absolute', bottom: '-17px', left: 0, right: 0, height: '2px', backgroundColor: '#38bdf8' }} />
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: Global Incident Oversight                         */}
      {/* ======================================================== */}
      {activeTab === 'INCIDENTS' && (
        <div>
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Showing {incidents.length} system-wide registered incidents with administrative override permissions.
            </div>
            <button
              onClick={fetchAllIncidents}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Reload All
            </button>
          </div>

          {isLoadingIncidents ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Loading global incident registry...
            </div>
          ) : incidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px' }}>
              No incidents registered in the system yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {incidents.map(inc => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '18px 24px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(16px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(26, 38, 66, 0.75)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 360px' }}>
                    <span 
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#38bdf8',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        padding: '4px 10px',
                        borderRadius: '8px'
                      }}
                    >
                      {inc.ticketNumber}
                    </span>
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: '#ffffff', margin: '0 0 4px 0' }}>
                        {inc.title}
                      </h4>
                      <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '10px' }}>
                        <span>Reporter: <strong style={{ color: '#cbd5e1' }}>{inc.reporter?.username}</strong></span>
                        <span>•</span>
                        <span>Assignee: <strong style={{ color: inc.assignee ? '#38bdf8' : '#f59e0b' }}>{inc.assignee?.username || 'Unassigned'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {inc.escalationLevel === 3 ? (
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                        ESC-3 CRITICAL
                      </span>
                    ) : (inc.escalationLevel === 2 || inc.slaBreached) ? (
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                        ESC-2 BREACHED
                      </span>
                    ) : inc.escalationLevel === 1 ? (
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                        ESC-1 WARNING
                      </span>
                    ) : null}

                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(255, 255, 255, 0.08)', color: '#e2e8f0' }}>
                      {inc.priority}
                    </span>
                    <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-display)', fontWeight: 700, padding: '3px 12px', borderRadius: '9999px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                      {inc.status}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '18px' }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: User Directory & RBAC Governance (Enhanced)       */}
      {/* ======================================================== */}
      {activeTab === 'USERS' && (
        <div>
          {/* Notifications / Alerts */}
          {userSuccess && (
            <div style={{ backgroundColor: 'rgba(0, 255, 135, 0.12)', border: '1px solid rgba(0, 255, 135, 0.3)', borderRadius: '12px', padding: '12px 18px', color: '#00ff87', fontSize: '13px', marginBottom: '20px' }}>
              {userSuccess}
            </div>
          )}

          {userError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px 18px', color: '#fca5a5', fontSize: '13px', marginBottom: '20px' }}>
              {userError}
            </div>
          )}

          {/* User Search & Filter Control Bar */}
          <div 
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '14px',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: '1 1 500px' }}>
              {/* Search input */}
              <input
                id="input-user-search"
                type="text"
                placeholder="Search username, name, or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(0); }}
                style={{
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: '240px',
                  flex: '1 1 240px'
                }}
              />

              {/* Role filter */}
              <select
                id="select-user-role-filter"
                value={userRoleFilter}
                onChange={(e) => { setUserRoleFilter(e.target.value); }}
                style={{
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Roles</option>
                <option value="ROLE_ADMIN">ROLE_ADMIN</option>
                <option value="ROLE_TECHNICIAN">ROLE_TECHNICIAN</option>
                <option value="ROLE_EMPLOYEE">ROLE_EMPLOYEE</option>
              </select>

              {/* Status filter */}
              <select
                id="select-user-status-filter"
                value={userStatusFilter}
                onChange={(e) => { setUserStatusFilter(e.target.value); }}
                style={{
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Disabled Only</option>
              </select>

              <button
                id="btn-apply-user-filter"
                onClick={() => fetchUsers(0)}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Search
              </button>

              {(userSearch || userRoleFilter !== 'ALL' || userStatusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setUserSearch('');
                    setUserRoleFilter('ALL');
                    setUserStatusFilter('ALL');
                    setTimeout(() => fetchUsers(0), 0);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#94a3b8',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
              Showing {users.length} of {userTotalElements} users
            </div>
          </div>

          {isLoadingUsers ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Fetching user directory from Spring Boot backend...
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px' }}>
              No users matching the active search filters.
            </div>
          ) : (
            <div 
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                overflow: 'hidden',
                backdropFilter: 'blur(16px)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(2, 6, 23, 0.6)' }}>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ID &amp; User</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Department</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RBAC Role</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const roleBadge = getRoleBadgeStyle(u.role);
                    const isCurrentUser = user?.username === u.username;
                    const isUserActive = u.isActive ?? (u as any).active ?? true;
                    return (
                      <tr 
                        key={u.id}
                        id={`user-row-${u.id}`}
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div 
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#ffffff'
                              }}
                            >
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{u.fullName || u.username}</span>
                                {isCurrentUser && (
                                  <span style={{ fontSize: '10px', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px' }}>YOU</span>
                                )}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: '#cbd5e1' }}>{u.email}</td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: '#94a3b8' }}>{u.department || 'General Staff'}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span 
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-display)',
                              fontWeight: 700,
                              backgroundColor: roleBadge.bg,
                              color: roleBadge.color,
                              border: `1px solid ${roleBadge.border}`,
                              padding: '3px 10px',
                              borderRadius: '9999px'
                            }}
                          >
                            {u.role || 'ROLE_EMPLOYEE'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isUserActive ? '#00ff87' : '#94a3b8' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isUserActive ? '#00ff87' : '#94a3b8' }} />
                            {isUserActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {/* Role management button */}
                            <button
                              id={`btn-change-role-${u.id}`}
                              onClick={() => handleOpenActionModal(u, 'CHANGE_ROLE')}
                              style={{
                                background: 'rgba(56, 189, 248, 0.08)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                color: '#38bdf8',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Change Role
                            </button>

                            {/* Activation / Deactivation button */}
                            {isUserActive ? (
                              <button
                                id={`btn-deactivate-user-${u.id}`}
                                onClick={() => handleOpenActionModal(u, 'DEACTIVATE')}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: '#f87171',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                id={`btn-activate-user-${u.id}`}
                                onClick={() => handleOpenActionModal(u, 'ACTIVATE')}
                                style={{
                                  background: 'rgba(0, 255, 135, 0.08)',
                                  border: '1px solid rgba(0, 255, 135, 0.25)',
                                  color: '#00ff87',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination bar */}
              {userTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Page {userPage + 1} of {userTotalPages}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => fetchUsers(userPage - 1)}
                      disabled={userPage <= 0}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: userPage <= 0 ? '#64748b' : '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: userPage <= 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => fetchUsers(userPage + 1)}
                      disabled={userPage >= userTotalPages - 1}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: userPage >= userTotalPages - 1 ? '#64748b' : '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: userPage >= userTotalPages - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: Incident Configuration & SLA Policies (Enhanced)  */}
      {/* ======================================================== */}
      {activeTab === 'CONFIG' && (
        <div>
          {/* Notifications */}
          {categorySuccess && (
            <div style={{ backgroundColor: 'rgba(0, 255, 135, 0.12)', border: '1px solid rgba(0, 255, 135, 0.3)', borderRadius: '12px', padding: '12px 18px', color: '#00ff87', fontSize: '13px', marginBottom: '20px' }}>
              {categorySuccess}
            </div>
          )}
          {categoryError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px 18px', color: '#fca5a5', fontSize: '13px', marginBottom: '20px' }}>
              {categoryError}
            </div>
          )}
          {slaSuccess && (
            <div style={{ backgroundColor: 'rgba(0, 255, 135, 0.12)', border: '1px solid rgba(0, 255, 135, 0.3)', borderRadius: '12px', padding: '12px 18px', color: '#00ff87', fontSize: '13px', marginBottom: '20px' }}>
              {slaSuccess}
            </div>
          )}
          {slaError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px 18px', color: '#fca5a5', fontSize: '13px', marginBottom: '20px' }}>
              {slaError}
            </div>
          )}

          {/* Section A: Categories Management */}
          <div 
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '32px'
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: '#ffffff', margin: '0 0 2px 0' }}>
                  Incident Taxonomy &amp; Categories
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Configure available categories and baseline service level targets without destructive database drops.
                </div>
              </div>
              <button
                id="btn-add-category-inner"
                onClick={handleOpenCreateCategory}
                className="btn-pill btn-pill-amber-pink"
                style={{ padding: '8px 18px', fontSize: '12.5px', fontWeight: 700 }}
              >
                + New Category
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(2, 6, 23, 0.6)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Category Name</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Description</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Default SLA</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingCategories ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading categories...</td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No categories configured.</td>
                  </tr>
                ) : (
                  categories.map(cat => {
                    const isCatActive = cat.isActive ?? (cat as any).active ?? true;
                    return (
                      <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 700, color: '#ffffff', fontSize: '13.5px' }}>
                          {cat.name}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: '#94a3b8' }}>
                          {cat.description || '—'}
                        </td>
                        <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#38bdf8' }}>
                          {cat.slaHours} hours
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span 
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: isCatActive ? 'rgba(0, 255, 135, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                              color: isCatActive ? '#00ff87' : '#94a3b8'
                            }}
                          >
                            {isCatActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              id={`btn-edit-category-${cat.id}`}
                              onClick={() => handleOpenEditCategory(cat)}
                              style={{
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                color: '#38bdf8',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              id={`btn-toggle-cat-${cat.id}`}
                              onClick={() => handleToggleCategoryStatus(cat)}
                              style={{
                                background: isCatActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 255, 135, 0.1)',
                                border: `1px solid ${isCatActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 255, 135, 0.3)'}`,
                                color: isCatActive ? '#f87171' : '#00ff87',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {isCatActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Section B: SLA Policies Management */}
          <div 
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: '#ffffff', margin: '0 0 2px 0' }}>
                  Core Priority SLA Policies
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Threshold targets per incident priority tier. Historical incidents preserve their original evaluated performance.
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(2, 6, 23, 0.6)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Priority Tier</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Response SLA</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Resolution SLA</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Description</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingSla ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading SLA policies...</td>
                  </tr>
                ) : slaPolicies.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No SLA policies loaded.</td>
                  </tr>
                ) : (
                  slaPolicies.map(policy => {
                    const isPolicyActive = policy.isActive ?? (policy as any).active ?? true;
                    return (
                      <tr key={policy.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            color: policy.priority === 'CRITICAL' ? '#f87171' : policy.priority === 'HIGH' ? '#fb923c' : policy.priority === 'MEDIUM' ? '#38bdf8' : '#94a3b8',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                          }}>
                            {policy.priority}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#fbbf24' }}>
                          {policy.responseTimeHours}h target
                        </td>
                        <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#00ff87' }}>
                          {policy.resolutionTimeHours}h target
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: '#94a3b8' }}>
                          {policy.description || 'Standard SLA parameters'}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: isPolicyActive ? 'rgba(0, 255, 135, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                            color: isPolicyActive ? '#00ff87' : '#94a3b8'
                          }}>
                            {isPolicyActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <button
                            id={`btn-edit-sla-${policy.priority.toLowerCase()}`}
                            onClick={() => handleOpenEditPolicy(policy)}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Edit Policy
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SLA Escalation & Automation Rules                 */}
      {/* ======================================================== */}
      {activeTab === 'AUTOMATION' && (
        <div>
          {/* Header & Quick Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#ffffff', margin: '0 0 4px 0' }}>
                Automated SLA Escalation &amp; Lifecycle Policies
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                Configurable threshold policies per priority level with automated multi-tier escalation and notification routing.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                id="btn-run-escalation-scan"
                onClick={handleTriggerScan}
                disabled={isScanning}
                className="btn-pill btn-pill-amber-pink"
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>⚡</span>
                <span>{isScanning ? 'Scanning...' : 'Run SLA Scan Now'}</span>
              </button>
              <button
                id="btn-retry-deliveries"
                onClick={handleRetryDeliveries}
                disabled={isRetrying}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <span>↻</span> {isRetrying ? 'Retrying...' : 'Retry Failed Deliveries'}
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {updateRuleSuccess && (
            <div style={{ backgroundColor: 'rgba(0, 255, 135, 0.12)', border: '1px solid rgba(0, 255, 135, 0.3)', borderRadius: '12px', padding: '12px 18px', color: '#00ff87', fontSize: '13px', marginBottom: '20px' }}>
              {updateRuleSuccess}
            </div>
          )}

          {retryResult && (
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '12px 18px', color: '#38bdf8', fontSize: '13px', marginBottom: '20px' }}>
              {retryResult}
            </div>
          )}

          {scanError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px 18px', color: '#fca5a5', fontSize: '13px', marginBottom: '20px' }}>
              {scanError}
            </div>
          )}

          {/* Scan Execution Live Metrics Card */}
          {scanResult && (
            <div
              id="sla-scan-results-card"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '28px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🚀</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '14.5px', color: '#ffffff' }}>
                    Latest SLA Escalation Scan Report
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#94a3b8' }}>
                  {new Date(scanResult.scanTimestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', textAlign: 'center' }}>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Evaluated</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{scanResult.totalIncidentsEvaluated}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase' }}>Warnings</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{scanResult.warningsTriggered}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: '#f87171', textTransform: 'uppercase' }}>Breaches</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{scanResult.breachesTriggered}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.08)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: '#c084fc', textTransform: 'uppercase' }}>Critical Esc</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#a855f7', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{scanResult.criticalEscalationsTriggered}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase' }}>Notifications</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{scanResult.notificationsDispatched}</div>
                </div>
              </div>
              {scanResult.escalatedTickets && scanResult.escalatedTickets.length > 0 && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>Tickets Escalated in this Run:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {scanResult.escalatedTickets.map((t, idx) => (
                      <span key={idx} style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '2px 8px', borderRadius: '6px' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Escalation Rules Table */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '32px'
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: '#ffffff', margin: '0 0 2px 0' }}>
                  Priority Escalation Matrices
                </h4>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Managed via <code style={{ color: '#38bdf8' }}>PUT /api/v1/automation/escalation/rules/&#123;priority&#125;</code> (Admin restricted)
                </div>
              </div>
              <button
                onClick={fetchEscalationRules}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer' }}
              >
                ↻ Refresh Rules
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(2, 6, 23, 0.6)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Priority Tier</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level 1 Warning</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level 2 Breach</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level 3 Critical</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Auto Unassigned</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Policy Status</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRules ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      Loading escalation rules...
                    </td>
                  </tr>
                ) : escalationRules.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      No rules configured yet. Standard system defaults are operating.
                    </td>
                  </tr>
                ) : (
                  escalationRules.map(rule => (
                    <tr key={rule.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          color: rule.priority === 'CRITICAL' ? '#f87171' : rule.priority === 'HIGH' ? '#fb923c' : rule.priority === 'MEDIUM' ? '#38bdf8' : '#94a3b8',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)'
                        }}>
                          {rule.priority}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#fbbf24' }}>
                        {rule.warningThresholdPercent}% elapsed
                      </td>
                      <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#ef4444' }}>
                        100% (Level {rule.breachLevel})
                      </td>
                      <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#c084fc' }}>
                        {rule.criticalThresholdPercent}% elapsed
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '12px', color: rule.autoEscalateUnassigned ? '#00ff87' : '#94a3b8' }}>
                          {rule.autoEscalateUnassigned ? '✓ Enabled' : '○ Off'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: rule.isActive ? 'rgba(0, 255, 135, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                          color: rule.isActive ? '#00ff87' : '#94a3b8'
                        }}>
                          {rule.isActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          id={`btn-edit-rule-${rule.priority.toLowerCase()}`}
                          onClick={() => setEditingRule({ ...rule })}
                          style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: Audit Log Explorer (New in Phase 6)               */}
      {/* ======================================================== */}
      {activeTab === 'AUDIT' && (
        <div>
          {/* Audit Search & Filter Bar */}
          <div 
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
              {/* Keyword Search */}
              <input
                id="input-audit-search"
                type="text"
                placeholder="Search action, actor, or ID..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchAuditEvents(0); }}
                style={{
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: '220px',
                  flex: '1 1 220px'
                }}
              />

              {/* Entity Type Filter */}
              <select
                id="select-audit-entity-filter"
                value={auditEntityType}
                onChange={(e) => setAuditEntityType(e.target.value)}
                style={{
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Entity Types</option>
                {availableEntityTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Action Filter */}
              <select
                id="select-audit-action-filter"
                value={auditAction}
                onChange={(e) => setAuditAction(e.target.value)}
                style={{
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Actions</option>
                {availableActions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {/* Username Filter */}
              <input
                id="input-audit-user"
                type="text"
                placeholder="Filter actor @username"
                value={auditUsername}
                onChange={(e) => setAuditUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchAuditEvents(0); }}
                style={{
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  width: '180px'
                }}
              />
            </div>

            {/* Date Range & Trigger Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label htmlFor="audit-start-date" style={{ fontSize: '11.5px', color: '#94a3b8' }}>From:</label>
                  <input
                    id="audit-start-date"
                    type="date"
                    value={auditStartDate}
                    onChange={(e) => setAuditStartDate(e.target.value)}
                    style={{
                      backgroundColor: 'rgba(2, 6, 23, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#ffffff',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label htmlFor="audit-end-date" style={{ fontSize: '11.5px', color: '#94a3b8' }}>To:</label>
                  <input
                    id="audit-end-date"
                    type="date"
                    value={auditEndDate}
                    onChange={(e) => setAuditEndDate(e.target.value)}
                    style={{
                      backgroundColor: 'rgba(2, 6, 23, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#ffffff',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  id="btn-apply-audit-filter"
                  onClick={() => fetchAuditEvents(0)}
                  style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    padding: '6px 16px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Apply Filters
                </button>

                {(auditSearch || auditEntityType !== 'ALL' || auditAction !== 'ALL' || auditUsername || auditStartDate || auditEndDate) && (
                  <button
                    onClick={() => {
                      setAuditSearch('');
                      setAuditEntityType('ALL');
                      setAuditAction('ALL');
                      setAuditUsername('');
                      setAuditStartDate('');
                      setAuditEndDate('');
                      setTimeout(() => fetchAuditEvents(0), 0);
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#94a3b8',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>

              <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                Showing {auditEvents.length} of {auditTotalElements} recorded audit events
              </div>
            </div>
          </div>

          {auditError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px 18px', color: '#fca5a5', fontSize: '13px', marginBottom: '20px' }}>
              {auditError}
            </div>
          )}

          {isLoadingAudit ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Querying immutable audit trail...
            </div>
          ) : auditEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px' }}>
              No audit events found matching the active query criteria.
            </div>
          ) : (
            <div 
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                overflow: 'hidden',
                backdropFilter: 'blur(16px)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(2, 6, 23, 0.6)' }}>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Timestamp</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actor</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Action</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Target Entity</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Outcome</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>IP Address</th>
                    <th style={{ padding: '14px 20px', fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>State Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.map(evt => {
                    const outcomeBadge = getOutcomeBadgeStyle(evt.outcome);
                    return (
                      <tr 
                        key={evt.id} 
                        id={`audit-row-${evt.id}`}
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                      >
                        <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                          {new Date(evt.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '12.5px' }}>
                              {evt.performedByUsername}
                            </div>
                            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#94a3b8', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                              {evt.performedByRole}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8'
                          }}>
                            {evt.action}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '12.5px', color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>
                          {evt.entityType} #{evt.entityId}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: outcomeBadge.bg,
                            color: outcomeBadge.color,
                            border: `1px solid ${outcomeBadge.border}`
                          }}>
                            {evt.outcome}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: '#94a3b8' }}>
                          {evt.ipAddress || 'internal'}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          {(evt.previousState || evt.newState) ? (
                            <button
                              id={`btn-diff-${evt.id}`}
                              onClick={() => setSelectedAuditEvent(evt)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#e2e8f0',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                cursor: 'pointer'
                              }}
                            >
                              Inspect Diff
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination controls */}
              {auditTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Page {auditPage + 1} of {auditTotalPages}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => fetchAuditEvents(auditPage - 1)}
                      disabled={auditPage <= 0}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: auditPage <= 0 ? '#64748b' : '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: auditPage <= 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => fetchAuditEvents(auditPage + 1)}
                      disabled={auditPage >= auditTotalPages - 1}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: auditPage >= auditTotalPages - 1 ? '#64748b' : '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: auditPage >= auditTotalPages - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: User Action Confirmation Modal                  */}
      {/* ======================================================== */}
      {actionUser && actionType && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#ffffff', margin: '0 0 8px 0' }}>
              {actionType === 'DEACTIVATE' && 'Confirm Account Deactivation'}
              {actionType === 'ACTIVATE' && 'Confirm Account Reactivation'}
              {actionType === 'CHANGE_ROLE' && 'Modify RBAC Role'}
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 18px 0' }}>
              Target user: <strong style={{ color: '#ffffff' }}>@{actionUser.username}</strong> ({actionUser.fullName})
            </p>

            {actionModalError && (
              <div 
                id="user-action-error-banner"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '12px', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}
              >
                ⚠️ {actionModalError}
              </div>
            )}

            {actionType === 'CHANGE_ROLE' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                  Select New RBAC Role
                </label>
                <select
                  id="select-target-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as 'ROLE_EMPLOYEE' | 'ROLE_TECHNICIAN' | 'ROLE_ADMIN')}
                  style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                >
                  <option value="ROLE_EMPLOYEE">ROLE_EMPLOYEE (Standard User)</option>
                  <option value="ROLE_TECHNICIAN">ROLE_TECHNICIAN (IT Support)</option>
                  <option value="ROLE_ADMIN">ROLE_ADMIN (Governance Administrator)</option>
                </select>
              </div>
            )}

            {actionType === 'DEACTIVATE' && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: '#fca5a5', marginBottom: '18px' }}>
                This user will immediately be locked out of authentication. Active administrator safeguards prevent deactivating the last remaining administrator.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setActionUser(null); setActionType(null); }}
                style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-user-action"
                type="button"
                onClick={handleExecuteUserAction}
                disabled={isExecutingAction}
                className="btn-pill btn-pill-amber-pink"
                style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 700 }}
              >
                {isExecutingAction ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Create / Edit Category Modal                    */}
      {/* ======================================================== */}
      {isCategoryModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#ffffff', margin: '0 0 6px 0' }}>
              {editingCategory ? 'Edit Incident Category' : 'Create New Incident Category'}
            </h3>
            <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '0 0 18px 0' }}>
              Changes take effect immediately while maintaining historical integrity.
            </p>

            {categoryFormError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '10px', color: '#fca5a5', fontSize: '12px', marginBottom: '16px' }}>
                {categoryFormError}
              </div>
            )}

            <form onSubmit={handleSaveCategory}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                  Category Name *
                </label>
                <input
                  id="input-category-name"
                  type="text"
                  required
                  placeholder="e.g. Identity &amp; Access"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                  Description
                </label>
                <input
                  id="input-category-desc"
                  type="text"
                  placeholder="Scope or domain notes"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                  Default SLA (Hours) *
                </label>
                <input
                  id="input-category-sla"
                  type="number"
                  min={1}
                  max={720}
                  required
                  value={categoryForm.slaHours}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slaHours: parseInt(e.target.value) || 24 })}
                  style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <input
                  type="checkbox"
                  id="chk-category-active"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="chk-category-active" style={{ fontSize: '12.5px', color: '#cbd5e1', cursor: 'pointer' }}>
                  Category is active for new incident ticket creation
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-save-category"
                  type="submit"
                  disabled={isSavingCategory}
                  className="btn-pill btn-pill-amber-pink"
                  style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 700 }}
                >
                  {isSavingCategory ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: Edit SLA Policy Modal                           */}
      {/* ======================================================== */}
      {editingPolicy && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#ffffff', margin: '0 0 6px 0' }}>
              Configure Core SLA Policy — {editingPolicy.priority}
            </h3>
            <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '0 0 18px 0' }}>
              Defines response and resolution hours for tickets classified as {editingPolicy.priority}.
            </p>

            {slaFormError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '10px', color: '#fca5a5', fontSize: '12px', marginBottom: '16px' }}>
                {slaFormError}
              </div>
            )}

            <form onSubmit={handleSaveSlaPolicy}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                    Response Target (h) *
                  </label>
                  <input
                    id="input-sla-response"
                    type="number"
                    min={1}
                    max={168}
                    required
                    value={slaForm.responseTimeHours}
                    onChange={(e) => setSlaForm({ ...slaForm, responseTimeHours: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                    Resolution Target (h) *
                  </label>
                  <input
                    id="input-sla-resolution"
                    type="number"
                    min={1}
                    max={720}
                    required
                    value={slaForm.resolutionTimeHours}
                    onChange={(e) => setSlaForm({ ...slaForm, resolutionTimeHours: parseInt(e.target.value) || 4 })}
                    style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                  Description / Operational Guidelines
                </label>
                <input
                  type="text"
                  value={slaForm.description}
                  onChange={(e) => setSlaForm({ ...slaForm, description: e.target.value })}
                  placeholder="e.g. Critical business disruption"
                  style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
                ℹ️ Resolution target must be greater than or equal to initial response target. Historical closed incident metrics will not be altered.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
                  style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-save-sla-policy"
                  type="submit"
                  disabled={isSavingSla}
                  className="btn-pill btn-pill-amber-pink"
                  style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 700 }}
                >
                  {isSavingSla ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: Audit Event State Diff Inspection Modal         */}
      {/* ======================================================== */}
      {selectedAuditEvent && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '680px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#ffffff', margin: '0 0 4px 0' }}>
                  Audit Event Diff — {selectedAuditEvent.action}
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Target: {selectedAuditEvent.entityType} #{selectedAuditEvent.entityId} • Performed by @{selectedAuditEvent.performedByUsername} at {new Date(selectedAuditEvent.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditEvent(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontFamily: 'var(--font-display)', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Previous State
                </div>
                <pre 
                  style={{
                    backgroundColor: 'rgba(2, 6, 23, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0
                  }}
                >
                  {selectedAuditEvent.previousState || '(None - initial creation)'}
                </pre>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', fontFamily: 'var(--font-display)', color: '#00ff87', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                  New State
                </div>
                <pre 
                  style={{
                    backgroundColor: 'rgba(2, 6, 23, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0
                  }}
                >
                  {selectedAuditEvent.newState || '(None - deleted)'}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedAuditEvent(null)}
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: Provision User Modal                            */}
      {/* ======================================================== */}
      {isCreateUserOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#ffffff', margin: '0 0 8px 0' }}>
              Provision New System User
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0' }}>
              Admin endpoint: <code style={{ color: '#38bdf8' }}>POST /api/v1/users/admin</code>. User will be created with BCrypt password hashing.
            </p>

            {createUserError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '10px', color: '#fca5a5', fontSize: '12px', marginBottom: '16px' }}>
                {createUserError}
              </div>
            )}

            {createUserSuccess && (
              <div style={{ backgroundColor: 'rgba(0, 255, 135, 0.12)', border: '1px solid rgba(0, 255, 135, 0.3)', borderRadius: '10px', padding: '10px', color: '#00ff87', fontSize: '12px', marginBottom: '16px' }}>
                {createUserSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>Username *</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="e.g. tech.alex"
                    style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="alex@resolv.internal"
                    style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.fullName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Alex Rivera"
                    style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>Department</label>
                  <input
                    type="text"
                    value={newUser.department}
                    onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Cloud Infrastructure"
                    style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>Initial Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Min 8 chars"
                    style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>RBAC Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="ROLE_TECHNICIAN">ROLE_TECHNICIAN (IT Support)</option>
                    <option value="ROLE_EMPLOYEE">ROLE_EMPLOYEE (End User)</option>
                    <option value="ROLE_ADMIN">ROLE_ADMIN (Full Governance)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8', borderRadius: '9999px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="btn-pill btn-pill-amber-pink"
                  style={{ padding: '9px 24px', fontSize: '13px', fontWeight: 700 }}
                >
                  {isCreatingUser ? 'Creating User...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: Edit Escalation Rule Modal                      */}
      {/* ======================================================== */}
      {editingRule && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#ffffff', margin: '0 0 6px 0' }}>
              Configure Escalation Policy — {editingRule.priority}
            </h3>
            <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '0 0 20px 0' }}>
              Threshold percentages relative to the priority&apos;s base SLA resolution duration.
            </p>

            {updateRuleError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '10px', color: '#fca5a5', fontSize: '12px', marginBottom: '16px' }}>
                {updateRuleError}
              </div>
            )}

            <form onSubmit={handleSaveRule}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                  Warning Threshold (% of SLA)
                </label>
                <input
                  type="number"
                  min={10}
                  max={99}
                  required
                  value={editingRule.warningThresholdPercent}
                  onChange={(e) => setEditingRule({ ...editingRule, warningThresholdPercent: parseInt(e.target.value) || 75 })}
                  style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                  Critical Prolonged Breach Threshold (% of SLA)
                </label>
                <input
                  type="number"
                  min={101}
                  max={500}
                  required
                  value={editingRule.criticalThresholdPercent}
                  onChange={(e) => setEditingRule({ ...editingRule, criticalThresholdPercent: parseInt(e.target.value) || 150 })}
                  style={{ width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="checkbox"
                  id="chk-auto-unassigned"
                  checked={editingRule.autoEscalateUnassigned}
                  onChange={(e) => setEditingRule({ ...editingRule, autoEscalateUnassigned: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="chk-auto-unassigned" style={{ fontSize: '12.5px', color: '#e2e8f0', cursor: 'pointer' }}>
                  Auto-flag unassigned tickets at warning threshold
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill btn-pill-amber-pink"
                  style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 700 }}
                >
                  Save Policy Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incident Detail Modal */}
      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdated={fetchAllIncidents}
      />
    </div>
  );
};
