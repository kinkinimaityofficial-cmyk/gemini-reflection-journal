import React from 'react';
import { UserProfile } from '../types';
import { Sparkles, ShieldCheck, LogOut, BookOpen, PenLine, Database } from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
  activeTab: 'editor' | 'history';
  onTabChange: (tab: 'editor' | 'history') => void;
  entriesCount: number;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onTabChange,
  entriesCount,
  onSignOut,
}) => {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-900 tracking-tight text-base sm:text-lg">
                Gemini Reflection
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                <Database className="w-3 h-3" /> Firestore Isolated
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              Private AI Journaling with Gemini 3.6 Flash
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            id="tab-btn-editor"
            type="button"
            onClick={() => onTabChange('editor')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'editor'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PenLine className="w-4 h-4" />
            <span>New Reflection</span>
          </button>
          <button
            id="tab-btn-history"
            type="button"
            onClick={() => onTabChange('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Entries ({entriesCount})</span>
          </button>
        </div>

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pl-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-stone-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-semibold">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-medium text-stone-900 truncate max-w-[120px]">
                {user.displayName || 'Journaler'}
              </p>
              <p className="text-[11px] text-stone-500 truncate max-w-[120px]">
                {user.email}
              </p>
            </div>
          </div>

          <button
            id="sign-out-btn"
            type="button"
            onClick={onSignOut}
            title="Sign out securely"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
