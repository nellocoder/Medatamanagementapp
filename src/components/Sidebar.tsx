import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  UserCog,
  FileText,
  LogOut,
  MapPin,
  Shield,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  currentUser: any;
  onLogout: () => void;
}

export function Sidebar({ currentView, onViewChange, currentUser, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'visits', label: 'Visits', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: UserCog, adminOnly: true },
    { id: 'admin', label: 'Admin Panel', icon: Shield, superAdminOnly: true },
    { id: 'audit', label: 'Audit Log', icon: FileText, adminOnly: true },
  ];

  const canAccess = (item: any) => {
    if (item.superAdminOnly) {
      return currentUser?.role === 'System Admin' || currentUser?.role === 'Admin';
    }
    if (!item.adminOnly) return true;
    return currentUser?.role === 'Admin' || currentUser?.role === 'System Admin' || currentUser?.role === 'M&E Officer';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">M&E System</h2>
            <p className="text-xs text-gray-500">Real-time tracking</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.filter(canAccess).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => onViewChange(item.id)}
            >
              <Icon className="w-4 h-4 mr-3" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-indigo-100 text-indigo-700">
              {currentUser?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentUser?.role}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          <span>{currentUser?.location || 'Location A'}</span>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}