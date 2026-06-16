import React from 'react';
import { LogOut, RefreshCw, User, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

interface RoleSelectorProps {
  currentRole: UserRole;
  phone: string;
  onLogout: () => void;
  onChangeRole: (newRole: UserRole) => void;
  profileName?: string;
}

export default function RoleSelector({
  currentRole,
  phone,
  onLogout,
  onChangeRole,
  profileName,
}: RoleSelectorProps) {
  // Completely hide workspace role selector bar for customers to maintain native app aesthetics
  if (currentRole === 'customer') {
    return null;
  }

  const roleLabels: Record<UserRole, string> = {
    customer: 'Customer App',
    seller: '🏬 Seller Dark Store Terminal',
    rider: '🛵 Courier Delivery Partner',
    admin: '👑 Super Administrator Workspace'
  };

  return (
    <div id="quick-role-selector" className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between text-xs relative z-50 shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-black tracking-wider text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>SWIFTCART LIVE WORKSPACE</span>
        </div>
        <div className="h-4 w-px bg-slate-800"></div>
        <span className="text-slate-300 font-bold bg-slate-800 px-3 py-1 rounded-lg border border-slate-700/50 uppercase tracking-wider text-[10px]">
          {roleLabels[currentRole] || currentRole}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onLogout}
          className="bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 transition active:scale-95 cursor-pointer uppercase tracking-wider text-[10px]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Account / Logout</span>
        </button>
      </div>
    </div>
  );
}
