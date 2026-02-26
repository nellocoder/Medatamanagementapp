import { useState } from 'react';
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
  ExternalLink,
  Scale,
  HeartPulse,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { cn } from './ui/utils';
import { hasHIVAccess } from '../utils/permissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface TopNavbarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  currentUser: any;
  onLogout: () => void;
}

export function TopNavbar({ currentView, onViewChange, currentUser, onLogout }: TopNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'visits', label: 'Visits', icon: ClipboardList },
    { id: 'paralegal', label: 'Paralegal', icon: Scale },
    { id: 'hiv', label: 'HIV Management', icon: HeartPulse, hivOnly: true },
    { id: 'referrals', label: 'Referrals', icon: ExternalLink },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: UserCog, adminOnly: true },
    { id: 'admin', label: 'Admin Panel', icon: Shield, superAdminOnly: true },
    { id: 'audit', label: 'Audit Log', icon: FileText, adminOnly: true },
  ];

  const canAccess = (item: any) => {
    if (item.hivOnly) {
      return hasHIVAccess(currentUser);
    }
    if (item.superAdminOnly) {
      return currentUser?.role === 'System Admin' || currentUser?.role === 'Admin';
    }
    if (!item.adminOnly) return true;
    return currentUser?.role === 'Admin' || currentUser?.role === 'System Admin' || currentUser?.role === 'M&E Officer';
  };

  const accessibleMenuItems = menuItems.filter(canAccess);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h2 className="font-semibold text-gray-900 leading-tight">M&E System</h2>
              <p className="text-xs text-gray-500">Real-time tracking</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center px-8">
            {accessibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    "transition-all duration-200",
                    isActive 
                      ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => {
                    onViewChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  <span className="text-sm">{item.label}</span>
                </Button>
              );
            })}
          </div>

          {/* User Menu & Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Desktop User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden lg:flex items-center gap-2 h-auto py-2 px-3">
                  <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">
                      {currentUser?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {currentUser?.name}
                    </p>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal bg-gray-200 text-gray-700">
                      {currentUser?.role}
                    </Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{currentUser?.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {currentUser?.location || 'Location A'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onLogout}
                  className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-2 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {accessibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    "w-full justify-start transition-all duration-200",
                    isActive 
                      ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => {
                    onViewChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
            
            {/* Mobile User Info */}
            <div className="pt-3 mt-3 border-t border-gray-200">
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal bg-gray-200 text-gray-700">
                      {currentUser?.role}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 px-3 py-1">
                <MapPin className="w-3 h-3" />
                <span>{currentUser?.location || 'Location A'}</span>
              </div>

              <Button
                variant="outline"
                className="w-full mt-2 justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
