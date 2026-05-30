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
  const roles: { val: UserRole; label: string; color: string }[] = [
    { val: 'customer', label: '🛒 Customer App', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { val: 'seller', label: '🏬 Seller Partner', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { val: 'rider', label: '🛵 Delivery Partner', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { val: 'admin', label: '👑 System Admin', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  ];

  return (
    <div id="quick-role-selector" className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs relative z-50 shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          SWIFT CART WORKSPACE
        </div>
        <div className="h-4 w-px bg-slate-700 hidden md:block"></div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Signed phone:</span>
          <span className="font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">{phone || 'System'}</span>
          {profileName && (
            <span className="text-slate-300 font-medium">({profileName})</span>
          )}
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        <span className="text-slate-400 font-medium hidden lg:inline">Quick Test Mode:</span>
        <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          {roles.map((r) => (
            <button
              key={r.val}
              id={`quick-switch-${r.val}`}
              onClick={() => onChangeRole(r.val)}
              className={`px-2.5 py-1 rounded transition-all font-semibold ${
                currentRole === r.val
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r.val === 'customer' ? 'Customer' : r.val === 'seller' ? 'Seller' : r.val === 'rider' ? 'Rider' : 'Admin'}
            </button>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="bg-rose-900/40 hover:bg-rose-950 text-rose-300 border border-rose-800/60 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition"
        >
          <LogOut className="w-3 h-3" />
          Logout
        </button>
      </div>
    </div>
  );
}
