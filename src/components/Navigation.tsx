import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Info,
  Users,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon: Icon, label, isActive, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full",
      isActive 
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
        : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
    )}
  >
    <Icon size={20} className={cn(isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600")} />
    <span className="font-medium">{label}</span>
  </button>
);

export function Sidebar({ currentView, setView }: { currentView: string; setView: (v: any) => void }) {
  const { user, profile, isAdmin, effectiveRole, activePortal, setActivePortal, logout } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const studentNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'teacher-class', label: 'My Teacher', icon: Users },
    { id: 'community', label: 'Community', icon: Globe },
    { id: 'lessons', label: 'Learning History', icon: BookOpen },
    { id: 'quizzes', label: 'Quizzes', icon: GraduationCap },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Docs', icon: Info },
  ];

  const teacherNav = [
    { id: 'teacher-home', label: 'Teacher Portal', icon: Users },
    { id: 'community', label: 'Community', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Docs', icon: Info },
  ];

  const adminNav = [
    { id: 'admin-home', label: 'Admin Portal', icon: ShieldCheck },
    { id: 'community', label: 'Community', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Docs', icon: Info },
  ];

  const navigation =
    activePortal === 'admin'
      ? adminNav
      : activePortal === 'teacher'
      ? teacherNav
      : studentNav;

  const handlePortalSwitch = (portal: UserRole) => {
    setActivePortal(portal);
    if (portal === 'admin') setView('admin-home');
    else if (portal === 'teacher') setView('teacher-home');
    else setView('dashboard');
    setIsOpen(false);
  };

  return (
    <>
      {!isOpen && (
        <div className="lg:hidden fixed top-4 left-4 z-[70]">
          <button 
            onClick={() => setIsOpen(true)}
            className="p-2 bg-white rounded-lg shadow-md border border-slate-100 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {(isOpen || window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -100 }}
            className={cn(
              "fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-100 z-[60] transition-transform duration-300 lg:translate-x-0 p-6 flex flex-col",
              isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
            )}
          >
            <button 
              onClick={() => setIsOpen(false)}
              className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            >
              <X size={24} />
            </button>

            {/* Logo */}
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="text-white" size={24} />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">MentorMind</h1>
            </div>

            {/* Admin Portal Switcher */}
            {isAdmin && (
              <div className="mb-6 p-1.5 bg-slate-100 rounded-2xl grid grid-cols-3 gap-1">
                {(['admin', 'teacher', 'student'] as UserRole[]).map((portal) => (
                  <button
                    key={portal}
                    onClick={() => handlePortalSwitch(portal)}
                    className={cn(
                      "py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all",
                      activePortal === portal
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {portal}
                  </button>
                ))}
              </div>
            )}

            {/* Nav Items */}
            <nav className="flex-1 space-y-2">
              {navigation.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  isActive={currentView === item.id}
                  onClick={() => {
                    setView(item.id);
                    setIsOpen(false);
                  }}
                />
              ))}
            </nav>

            {/* User Profile Summary */}
            <div className="mt-auto pt-6 border-t border-slate-50">
              <div className="flex items-center gap-3 px-2 mb-4">
                <img 
                  src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
                  className="w-10 h-10 rounded-full border-2 border-slate-100"
                  alt="Avatar"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {profile?.displayName || user?.displayName}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 truncate tracking-tight">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
                    {effectiveRole}
                  </span>
                </div>
              </div>
              <button 
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut size={20} />
                <span className="font-medium text-sm">Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
