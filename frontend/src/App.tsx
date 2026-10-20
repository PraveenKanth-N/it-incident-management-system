import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { ExecutiveCommandHub } from './components/dashboard/ExecutiveCommandHub';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { UnauthorizedPage } from './components/workspaces/UnauthorizedPage';
import { EmployeeWorkspace } from './components/workspaces/EmployeeWorkspace';
import { TechnicianWorkspace } from './components/workspaces/TechnicianWorkspace';
import { AdminWorkspace } from './components/workspaces/AdminWorkspace';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { CreateIncidentModal } from './components/incident/CreateIncidentModal';
import { IncidentDetailModal } from './components/incident/IncidentDetailModal';
import { IncidentListPage } from './components/incident/IncidentListPage';
import { CreateIncidentPage } from './components/incident/CreateIncidentPage';
import { IncidentDetailPage } from './components/incident/IncidentDetailPage';
import { AnalyticsDashboardPage } from './components/dashboard/AnalyticsDashboardPage';
import { incidentApi, getStoredToken, type IncidentResponse } from './services/api';
import './App.css';

// Intelligent Workspace Route Redirect based on primary RBAC role
const WorkspaceRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ROLE_ADMIN') return <Navigate to="/workspace/admin" replace />;
  if (user.role === 'ROLE_TECHNICIAN') return <Navigate to="/workspace/technician" replace />;
  return <Navigate to="/workspace/employee" replace />;
};

// Main Application Layout Shell
const MainAppShell: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentResponse | null>(null);
  const [systemHealth, setSystemHealth] = useState<string>('ALL SYSTEMS MONITORED (99.8%)');
  const [queueCount, setQueueCount] = useState<number>(0);

  const refreshQueueCount = async () => {
    try {
      const data = await incidentApi.getIncidents({ page: 0, size: 50 });
      const count = data.content.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
      setQueueCount(count);
    } catch {
      setQueueCount(0);
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const data = await incidentApi.checkHealth();
        if (active) setSystemHealth(`BACKEND ONLINE • ${data.service.toUpperCase()}`);
      } catch {
        if (active) setSystemHealth('STANDBY MODE • REAL-TIME MESH ACTIVE');
      }

      if (getStoredToken()) {
        try {
          const data = await incidentApi.getIncidents({ page: 0, size: 50 });
          if (active) {
            const count = data.content.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
            setQueueCount(count);
          }
        } catch {
          if (active) setQueueCount(0);
        }
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  const handleNavigateSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      <Navbar
        onOpenCreateIncident={() => setIsCreateOpen(true)}
        onNavigateSection={handleNavigateSection}
        systemHealthStatus={systemHealth}
        activeQueueCount={queueCount}
      />

      <Routes>
        {/* Public Executive Command Hub (Team Computers Reference Replication) */}
        <Route 
          path="/" 
          element={
            <main>
              <ExecutiveCommandHub
                onOpenCreateIncident={() => setIsCreateOpen(true)}
                onSelectIncident={(incident) => setSelectedIncident(incident)}
              />
            </main>
          } 
        />

        {/* Public / Autonomous Login View */}
        <Route path="/login" element={<LoginPage />} />

        {/* Public Employee Self-Registration View */}
        <Route path="/register" element={<RegisterPage />} />

        {/* 403 Forbidden Error State */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Intelligent Workspace Hub Redirection */}
        <Route 
          path="/workspace" 
          element={
            <ProtectedRoute>
              <WorkspaceRedirect />
            </ProtectedRoute>
          } 
        />

        {/* Protected Workspace 1: Employee Self-Service Desk */}
        <Route 
          path="/workspace/employee" 
          element={
            <ProtectedRoute allowedRoles={['ROLE_EMPLOYEE', 'ROLE_TECHNICIAN', 'ROLE_ADMIN']}>
              <EmployeeWorkspace />
            </ProtectedRoute>
          } 
        />

        {/* Protected Workspace 2: Technician Operations Workbench */}
        <Route 
          path="/workspace/technician" 
          element={
            <ProtectedRoute allowedRoles={['ROLE_TECHNICIAN', 'ROLE_ADMIN']}>
              <TechnicianWorkspace />
            </ProtectedRoute>
          } 
        />

        {/* Protected Workspace 3: Administrator Command & Governance */}
        <Route 
          path="/workspace/admin" 
          element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <AdminWorkspace />
            </ProtectedRoute>
          } 
        />

        {/* Page Group 2: Incident Directory & Management Suite */}
        <Route 
          path="/incidents" 
          element={
            <ProtectedRoute>
              <IncidentListPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/incidents/new" 
          element={
            <ProtectedRoute>
              <CreateIncidentPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/incidents/:id" 
          element={
            <ProtectedRoute>
              <IncidentDetailPage />
            </ProtectedRoute>
          } 
        />

        {/* Phase 4: Operational Intelligence & KPI Analytics Dashboard */}
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_TECHNICIAN', 'ROLE_EMPLOYEE']}>
              <AnalyticsDashboardPage />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Incident Creation Modal */}
      <CreateIncidentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onIncidentCreated={() => {
          refreshQueueCount();
          const triage = document.getElementById('triage-table');
          if (triage) triage.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Global Incident Detail / Triage Modal */}
      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdated={() => {
          refreshQueueCount();
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainAppShell />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
