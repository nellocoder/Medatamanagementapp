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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from './ui/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  currentUser: any;
  onLogout: () => void;
}

export function Sidebar({ currentView, onViewChange, currentUser, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div 
      className={cn(
        "relative flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-10",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-6 z-20 h-6 w-6 rounded-full border bg-white shadow-md hover:bg-gray-100 p-0"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {/* Header */}
      <div className={cn("flex items-center p-4 border-b border-gray-200 h-20", isCollapsed ? "justify-center" : "")}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className={cn("whitespace-nowrap transition-all duration-300 overflow-hidden", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
            <h2 className="font-semibold text-gray-900 leading-tight">M&E System</h2>
            <p className="text-xs text-gray-500">Real-time tracking</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {menuItems.filter(canAccess).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          const ButtonContent = (
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                "w-full transition-all duration-200 relative group",
                isActive ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "justify-start px-4"
              )}
              onClick={() => onViewChange(item.id)}
            >
              <Icon className={cn("h-5 w-5 shrink-0 transition-all", isCollapsed ? "" : "mr-3")} />
              <span className={cn("truncate transition-all duration-300", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block")}>
                {item.label}
              </span>
            </Button>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  {ButtonContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.id}>{ButtonContent}</div>;
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200 space-y-3 bg-gray-50/50">
        <div className={cn("flex items-center gap-3 transition-all", isCollapsed ? "justify-center" : "")}>
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm shrink-0">
            <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">
              {currentUser?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className={cn("flex-1 min-w-0 overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block")}>
            <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal bg-gray-200 text-gray-700 hover:bg-gray-200">
                {currentUser?.role}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className={cn("flex items-center gap-2 text-xs text-gray-500 px-1 transition-all duration-300", isCollapsed ? "h-0 opacity-0 overflow-hidden" : "h-auto opacity-100")}>
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{currentUser?.location || 'Location A'}</span>
        </div>

        {isCollapsed ? (
             <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full justify-center text-red-600 hover:bg-red-50 hover:text-red-700 h-9 w-9 mx-auto"
                    onClick={onLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-red-600 font-medium">Logout</TooltipContent>
             </Tooltip>
        ) : (
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
        )}
      </div>
    </div>
  );
}
