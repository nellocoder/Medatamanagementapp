import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { ClientManagement } from './components/ClientManagement';
import { VisitManagement } from './components/VisitManagement';
import { UserManagement } from './components/UserManagement';
import { AdminPanel } from './components/AdminPanel';
import { AuditLog } from './components/AuditLog';
import { Reports } from './components/Reports';
import { Sidebar } from './components/Sidebar';
import { Toaster } from './components/ui/sonner';
import { useInitializeData } from './components/InitializeData';
import { getRolePermissions } from './utils/permissions';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const initialized = useInitializeData();

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      
      // Always refresh permissions from the role definition to ensure they are up to date
      if (user.role) {
        const rolePermissions = getRolePermissions(user.role);
        const permissionOverrides = Array.isArray(user.permissionOverrides) 
          ? user.permissionOverrides 
          : [];
        user.permissions = [...new Set([...rolePermissions, ...permissionOverrides])];
      }
      
      setCurrentUser(user);
    }
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCurrentView('dashboard');
  };

  const handleNavigateToVisit = (visitId: string) => {
    setSelectedVisitId(visitId);
    setCurrentView('visits');
  };

  const handleNavigateToVisits = () => {
    setCurrentView('visits');
    setSelectedVisitId(null);
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    // Clear selected visit when navigating via sidebar to show the list
    if (view === 'visits') {
      setSelectedVisitId(null);
    }
  };

  if (!currentUser) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        currentView={currentView}
        onViewChange={handleViewChange}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 overflow-auto">
        {currentView === 'dashboard' && (
          <Dashboard 
            currentUser={currentUser} 
            onNavigateToVisit={handleNavigateToVisit}
            onNavigateToVisits={handleNavigateToVisits}
          />
        )}
        {currentView === 'clients' && <ClientManagement currentUser={currentUser} />}
        {currentView === 'visits' && (
          <VisitManagement 
            currentUser={currentUser} 
            initialVisitId={selectedVisitId}
          />
        )}
        {currentView === 'users' && <UserManagement currentUser={currentUser} />}
        {currentView === 'admin' && <AdminPanel currentUser={currentUser} />}
        {currentView === 'audit' && <AuditLog currentUser={currentUser} />}
        {currentView === 'reports' && <Reports currentUser={currentUser} />}
      </div>
      
      <Toaster />
    </div>
  );
}