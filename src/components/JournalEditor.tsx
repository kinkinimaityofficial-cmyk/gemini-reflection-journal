import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  RotateCw,
  Tag,
  Check,
  AlertCircle,
  PlusCircle,
  Copy,
  Layers,
  Wand2,
  Clock,
  FileText,
} from 'lucide-react';
import { ChatMessage, JournalEntry, ReflectionMode, UserProfile } from '../types';
import { REFLECTION_MODES } from '../lib/constants';
import { sendReflectionPrompt, generateEntryMetadata } from '../lib/geminiApi';
import { saveJournalEntry } from '../lib/firebase';

interface JournalEditorProps {
  user: UserProfile;
  currentEntry: JournalEntry | null;
  onEntrySaved: (entry: JournalEntry) => void;
  onNewEntry: () => void;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  user,
  currentEntry,
  onEntrySaved,
  onNewEntry,
}) => {
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>(
    currentEntry?.reflectionMode || 'reflect'
  );
  const [title, setTitle] = useState(currentEntry?.title || '');
  const [tags, setTags] = useState<string[]>(currentEntry?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(currentEntry?.messages || []);
  const [entryId, setEntryId] = useState<string>(
    currentEntry?.id || `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  );
  const [createdAt, setCreatedAt] = useState<number>(currentEntry?.createdAt || Date.now());

  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync when currentEntry changes from props (e.g. clicking an entry from history)
  useEffect(() => {
    if (currentEntry) {
      setEntryId(currentEntry.id);
      setTitle(currentEntry.title);
      setSelectedMode(currentEntry.reflectionMode);
      setTags(currentEntry.tags || []);
      setMessages(currentEntry.messages || []);
      setCreatedAt(currentEntry.createdAt);
      setSaveStatus('saved');
      setErrorMessage(null);
    }
  }, [currentEntry]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const activeModeConfig =
    REFLECTION_MODES.find((m) => m.id === selectedMode) || REFLECTION_MODES[0];

  const handleAddTag = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter' && e.key !== ',') return;
    if (e && 'key' in e) e.preventDefault();

    const cleanTag = tagInput.trim().toLowerCase().replace(/^[#,]/, '');
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 8) {
      setTags([...tags, cleanTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Helper to persist entry state to Firestore
  const persistEntryToFirestore = async (
    updatedMessages: ChatMessage[],
    entryTitle: string,
    entryTags: string[],
    mode: ReflectionMode
  ) => {
    setSaveStatus('saving');
    setErrorMessage(null);

    const totalWordCount = updatedMessages.reduce((acc, m) => {
      return acc + (m.content.split(/\s+/).filter(Boolean).length || 0);
    }, 0);

    const updatedEntry: JournalEntry = {
      id: entryId,
      userId: user.uid,
      title: entryTitle || 'Untitled Reflection',
      initialPrompt: updatedMessages[0]?.content || '',
      reflectionMode: mode,
      tags: entryTags,
      messages: updatedMessages,
      wordCount: totalWordCount,
      createdAt,
      updatedAt: Date.now(),
    };

    try {
      await saveJournalEntry(user.uid, updatedEntry);
      setSaveStatus('saved');
      onEntrySaved(updatedEntry);
    } catch (err: any) {
      console.error('Firestore save failed:', err);
      setSaveStatus('error');
      setErrorMessage(err?.message || 'Failed to save to Firestore. Click retry to persist.');
    }
  };

  const handleSendPrompt = async (textToSend?: string) => {
    const rawText = textToSend || promptInput;
    if (!rawText.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      role: 'user',
      content: rawText.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setPromptInput('');
    setIsProcessing(true);
    setErrorMessage(null);

    let currentTitle = title;
    let currentTags = tags;

    // Auto-generate title if this is the first prompt and title is empty
    if (!title.trim() && messages.length === 0) {
      currentTitle = rawText.trim().slice(0, 45) + (rawText.length > 45 ? '...' : '');
      setTitle(currentTitle);
    }

    try {
      // Call server-side Gemini reflection with fallback ladder
      const result = await sendReflectionPrompt(rawText, selectedMode, messages);

      const geminiMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        role: 'model',
        content: result.response,
        timestamp: Date.now(),
        modelUsed: result.modelUsed,
      };

      const finalMessages = [...newMessages, geminiMessage];
      setMessages(finalMessages);

      // If first turn, generate intelligent title and tags asynchronously
      if (messages.length === 0) {
        generateEntryMetadata(rawText).then((meta) => {
          if (meta.success && meta.title) {
            setTitle(meta.title);
            const combinedTags = Array.from(new Set([...currentTags, ...meta.tags]));
            setTags(combinedTags);
            persistEntryToFirestore(finalMessages, meta.title, combinedTags, selectedMode);
          }
        }).catch(() => {});
      }

      await persistEntryToFirestore(finalMessages, currentTitle, currentTags, selectedMode);
    } catch (err: any) {
      console.error('Error during reflection generation:', err);
      setErrorMessage(err?.message || 'Failed to get reflection from Gemini.');
      setSaveStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateTitle = async () => {
    if (messages.length === 0 && !promptInput) return;
    try {
      setIsGeneratingTitle(true);
      const textToSummarize = messages.map((m) => m.content).join('\n') || promptInput;
      const meta = await generateEntryMetadata(textToSummarize);
      if (meta.success && meta.title) {
        setTitle(meta.title);
        const combined = Array.from(new Set([...tags, ...meta.tags]));
        setTags(combined);
        await persistEntryToFirestore(messages, meta.title, combined, selectedMode);
      }
    } catch (err) {
      console.error('Error generating metadata:', err);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const handleManualRetrySave = () => {
    persistEntryToFirestore(messages, title, tags, selectedMode);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Workspace Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-2xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <input
                id="journal-title-input"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSaveStatus('saving');
                }}
                onBlur={() => persistEntryToFirestore(messages, title, tags, selectedMode)}
                placeholder="Give this reflection a title..."
                className="w-full text-xl sm:text-2xl font-bold text-stone-900 placeholder:text-stone-300 focus:outline-hidden bg-transparent tracking-tight"
              />
              <button
                id="auto-title-btn"
                type="button"
                onClick={handleGenerateTitle}
                disabled={isGeneratingTitle || (messages.length === 0 && !promptInput)}
                title="Auto-suggest title & tags with Gemini"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <Wand2 className={`w-4 h-4 ${isGeneratingTitle ? 'animate-spin text-amber-500' : ''}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <Clock className="w-3 h-3" />
              <span>{new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span>•</span>
              <FileText className="w-3 h-3" />
              <span>{messages.reduce((acc, m) => acc + (m.content.split(/\s+/).filter(Boolean).length || 0), 0)} words</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Persistence indicator */}
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-stone-200 bg-stone-50">
              {saveStatus === 'saving' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-stone-600">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-stone-600">Saved to Firestore</span>
                </>
              )}
              {saveStatus === 'error' && (
                <button
                  onClick={handleManualRetrySave}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Save Failed (Retry)</span>
                </button>
              )}
            </div>

            <button
              id="new-reflection-btn"
              type="button"
              onClick={onNewEntry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Reflection Mode Selector */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-stone-500 mb-2">
            Reflection Intent & Processing Mode:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {REFLECTION_MODES.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  id={`mode-btn-${mode.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedMode(mode.id);
                    if (messages.length > 0) {
                      persistEntryToFirestore(messages, title, tags, mode.id);
                    }
                  }}
                  className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <p className="text-xs font-semibold">{mode.label}</p>
                  <p
                    className={`text-[11px] mt-0.5 leading-tight line-clamp-1 ${
                      isSelected ? 'text-stone-300' : 'text-stone-500'
                    }`}
                  >
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags Section */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-stone-400 mr-1" />
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-500 text-stone-400 ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
          <div className="inline-flex items-center">
            <input
              id="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="+ Add tag..."
              className="text-xs px-2 py-0.5 rounded-full border border-dashed border-stone-200 text-stone-700 focus:outline-hidden focus:border-stone-400 bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error notification banner if any */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Multi-Turn Conversation Thread */}
      <div className="space-y-4 mb-6">
        {messages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-base font-semibold text-stone-900">
              Start your {activeModeConfig.label} reflection
            </h3>
            <p className="mt-1 text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              Write openly about what is on your mind. Gemini 3.6 Flash will respond with
              supportive reflections, summaries, or structured insights.
            </p>

            {/* Quick Starter Prompts */}
            <div className="mt-6 text-left max-w-lg mx-auto">
              <p className="text-xs font-semibold text-stone-600 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Prompt Starters:
              </p>
              <div className="space-y-1.5">
                {activeModeConfig.starterPrompts.map((starter, idx) => (
                  <button
                    key={idx}
                    id={`starter-prompt-${idx}`}
                    type="button"
                    onClick={() => {
                      setPromptInput(starter);
                      textareaRef.current?.focus();
                    }}
                    className="w-full text-left p-2.5 text-xs rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-stone-700 transition-colors cursor-pointer"
                  >
                    "{starter}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`w-full max-w-2xl rounded-2xl p-4 sm:p-5 text-sm ${
                    isUser
                      ? 'bg-stone-900 text-white shadow-xs ml-auto'
                      : 'bg-white text-stone-900 border border-stone-200 shadow-2xs mr-auto'
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-100/10 text-xs">
                    <div className="flex items-center gap-2">
                      {isUser ? (
                        <span className="font-semibold text-stone-200">Your Reflection</span>
                      ) : (
                        <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Gemini Insight</span>
                        </span>
                      )}
                      {msg.modelUsed && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-stone-100 text-stone-600 border border-stone-200">
                          {msg.modelUsed}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] ${isUser ? 'text-stone-400' : 'text-stone-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.content, index)}
                          title="Copy response"
                          className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed text-stone-100">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="prose prose-stone prose-sm max-w-none dark:prose-invert leading-relaxed">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-start">
            <div className="w-full max-w-2xl rounded-2xl p-5 bg-white border border-stone-200 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-medium text-stone-600 mb-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>Gemini is processing your reflection...</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-stone-100 rounded-full w-5/6 animate-pulse" />
                <div className="h-3 bg-stone-100 rounded-full w-4/6 animate-pulse" />
                <div className="h-3 bg-stone-100 rounded-full w-3/6 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Input Bar */}
      <div className="sticky bottom-4 z-20">
        <div className="bg-white rounded-2xl border border-stone-300 p-3 sm:p-4 shadow-lg">
          <textarea
            id="reflection-prompt-input"
            ref={textareaRef}
            rows={3}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              messages.length === 0
                ? activeModeConfig.placeholder
                : 'Continue this reflection or ask Gemini a follow-up question...'
            }
            className="w-full text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden resize-none bg-transparent"
          />

          <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 mt-1">
            <div className="flex items-center gap-2 text-[11px] text-stone-400">
              <span>{promptInput.length} chars</span>
              <span>•</span>
              <span className="hidden sm:inline">Press Cmd/Ctrl + Enter to send</span>
            </div>

            <button
              id="submit-prompt-btn"
              type="button"
              disabled={isProcessing || !promptInput.trim()}
              onClick={() => handleSendPrompt()}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <span>Reflect with Gemini</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
