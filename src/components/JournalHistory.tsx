import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Calendar,
  Tag,
  Trash2,
  ArrowUpRight,
  Sparkles,
  Layers,
  FileText,
  Clock,
} from 'lucide-react';
import { JournalEntry, ReflectionMode } from '../types';
import { REFLECTION_MODES } from '../lib/constants';

interface JournalHistoryProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onNewEntry: () => void;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  entries,
  onSelectEntry,
  onDeleteEntry,
  onNewEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract all unique tags across all entries
  const allTags = Array.from(
    new Set(entries.flatMap((entry) => entry.tags || []))
  ).filter(Boolean);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    // Mode filter
    if (selectedModeFilter !== 'all' && entry.reflectionMode !== selectedModeFilter) {
      return false;
    }

    // Tag filter
    if (selectedTagFilter && !entry.tags?.includes(selectedTagFilter)) {
      return false;
    }

    // Search query filter (matches title, initialPrompt, tags, or message contents)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = entry.title?.toLowerCase().includes(q);
      const matchPrompt = entry.initialPrompt?.toLowerCase().includes(q);
      const matchTags = entry.tags?.some((t) => t.toLowerCase().includes(q));
      const matchMessages = entry.messages?.some((m) => m.content.toLowerCase().includes(q));
      return matchTitle || matchPrompt || matchTags || matchMessages;
    }

    return true;
  });

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteEntry(entryToDelete);
      setEntryToDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getModeLabel = (mode: ReflectionMode) => {
    return REFLECTION_MODES.find((m) => m.id === mode)?.label || mode;
  };

  const getModeBadgeColor = (mode: ReflectionMode) => {
    return (
      REFLECTION_MODES.find((m) => m.id === mode)?.badgeColor ||
      'bg-stone-100 text-stone-700 border-stone-200'
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Reflection Archive
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Your private journal entries saved securely in your isolated Firestore collection.
          </p>
        </div>

        <button
          id="history-new-reflection-btn"
          type="button"
          onClick={onNewEntry}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>New Reflection</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs mb-6 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="history-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search entries by keywords, topics, or insights..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-400 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100">
          {/* Mode Filters */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-medium text-stone-400 mr-1">Mode:</span>
            <button
              type="button"
              onClick={() => setSelectedModeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedModeFilter === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All Modes
            </button>
            {REFLECTION_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSelectedModeFilter(mode.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedModeFilter === mode.id
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Active Tag Filter indicator */}
          {selectedTagFilter && (
            <div className="flex items-center gap-1.5 text-xs bg-stone-100 px-2.5 py-1 rounded-lg text-stone-700">
              <span>Tag: #{selectedTagFilter}</span>
              <button
                type="button"
                onClick={() => setSelectedTagFilter(null)}
                className="font-bold hover:text-red-500"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Popular Tags List */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Tag className="w-3 h-3 text-stone-400 mr-1" />
            <span className="text-[11px] text-stone-400">Popular:</span>
            {allTags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setSelectedTagFilter(selectedTagFilter === tag ? null : tag)
                }
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                  selectedTagFilter === tag
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-stone-900">
            {entries.length === 0 ? 'No reflection entries yet' : 'No matching entries found'}
          </h3>
          <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
            {entries.length === 0
              ? 'Begin by writing down your thoughts in the reflection editor. Gemini will provide reflections and insights.'
              : 'Try clearing your search terms or filters to view your other saved journal entries.'}
          </p>
          {entries.length === 0 && (
            <button
              type="button"
              onClick={onNewEntry}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Create First Reflection</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => {
            const previewText =
              entry.initialPrompt ||
              entry.messages?.find((m) => m.role === 'user')?.content ||
              '';
            const lastGeminiMsg = entry.messages
              ?.slice()
              .reverse()
              .find((m) => m.role === 'model')?.content;

            return (
              <div
                key={entry.id}
                id={`entry-card-${entry.id}`}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Mode & Date */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getModeBadgeColor(
                        entry.reflectionMode
                      )}`}
                    >
                      {getModeLabel(entry.reflectionMode)}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => onSelectEntry(entry)}
                    className="font-bold text-stone-900 text-base hover:text-stone-700 cursor-pointer line-clamp-1 mb-1.5"
                  >
                    {entry.title || 'Untitled Reflection'}
                  </h3>

                  {/* User Excerpt */}
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-3">
                    {previewText}
                  </p>

                  {/* Gemini Key Insight Excerpt */}
                  {lastGeminiMsg && (
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-stone-700 text-xs mb-3 line-clamp-2">
                      <span className="font-semibold text-stone-900 text-[11px] block mb-0.5">
                        Latest Insight:
                      </span>
                      {lastGeminiMsg.replace(/[*#]/g, '')}
                    </div>
                  )}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md text-[10px] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer with Stats & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                  <div className="flex items-center gap-3 text-[11px] text-stone-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {entry.messages?.length || 0} turns
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {entry.wordCount || 0} words
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEntryToDelete(entry.id)}
                      title="Delete entry"
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectEntry(entry)}
                      className="flex items-center gap-1 px-3 py-1 bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>Open</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-sm w-full shadow-xl">
            <h4 className="font-bold text-stone-900 text-base">Delete Reflection?</h4>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              This action cannot be undone. It will permanently remove this entry and conversation from your Firestore database.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEntryToDelete(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
