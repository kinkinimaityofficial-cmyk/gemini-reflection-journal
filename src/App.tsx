import React, { useState, useEffect } from 'react';
import { UserProfile, JournalEntry } from './types';
import {
  subscribeToAuth,
  signInWithGoogle,
  signOut,
  fetchUserEntries,
  deleteJournalEntry,
} from './lib/firebase';
import { AuthLanding } from './components/AuthLanding';
import { Navbar } from './components/Navbar';
import { JournalEditor } from './components/JournalEditor';
import { JournalHistory } from './components/JournalHistory';
import { Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Subscribe to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // When user is authenticated, load their isolated entries from Firestore
  useEffect(() => {
    if (user?.uid) {
      loadEntries(user.uid);
    } else {
      setEntries([]);
      setCurrentEntry(null);
    }
  }, [user?.uid]);

  const loadEntries = async (userId: string) => {
    try {
      setIsLoadingEntries(true);
      setGlobalError(null);
      const data = await fetchUserEntries(userId);
      setEntries(data);
    } catch (err: any) {
      console.error('Failed to load user entries from Firestore:', err);
      setGlobalError('Could not load past entries. Please verify database connection.');
    } finally {
      setIsLoadingEntries(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setGlobalError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setEntries([]);
      setCurrentEntry(null);
      setActiveTab('editor');
    } catch (err: any) {
      console.error('Sign Out Error:', err);
    }
  };

  const handleEntrySaved = (savedEntry: JournalEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === savedEntry.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedEntry;
        return copy.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
      return [savedEntry, ...prev];
    });
    setCurrentEntry(savedEntry);
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setActiveTab('editor');
  };

  const handleNewEntry = () => {
    setCurrentEntry(null);
    setActiveTab('editor');
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user?.uid) return;
    try {
      await deleteJournalEntry(user.uid, entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      if (currentEntry?.id === entryId) {
        setCurrentEntry(null);
      }
    } catch (err: any) {
      console.error('Failed to delete entry:', err);
      setGlobalError('Failed to delete entry from Firestore.');
    }
  };

  // Initial Auth Loading state
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-stone-600">
          <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-xs animate-bounce">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
            <div className="w-3 h-3 border-2 border-stone-400 border-t-stone-800 rounded-full animate-spin" />
            <span>Connecting to Firebase Auth...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated: Render landing page
  if (!user) {
    return <AuthLanding onSignIn={handleSignIn} />;
  }

  // Authenticated: Render dashboard
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col selection:bg-stone-200">
      <Navbar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        entriesCount={entries.length}
        onSignOut={handleSignOut}
      />

      {globalError && (
        <div className="max-w-4xl mx-auto w-full px-4 mt-4">
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{globalError}</span>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-red-700 hover:text-red-900 font-bold ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pb-16">
        {activeTab === 'editor' ? (
          <JournalEditor
            key={currentEntry ? currentEntry.id : 'new-session'}
            user={user}
            currentEntry={currentEntry}
            onEntrySaved={handleEntrySaved}
            onNewEntry={handleNewEntry}
          />
        ) : (
          <JournalHistory
            entries={entries}
            onSelectEntry={handleSelectEntry}
            onDeleteEntry={handleDeleteEntry}
            onNewEntry={handleNewEntry}
          />
        )}
      </main>
    </div>
  );
}
