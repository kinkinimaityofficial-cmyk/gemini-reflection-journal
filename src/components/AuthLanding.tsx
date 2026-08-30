import React, { useState } from 'react';
import { Sparkles, Shield, Lock, BrainCircuit, ArrowRight, CheckCircle2, MessageSquareText } from 'lucide-react';

interface AuthLandingProps {
  onSignIn: () => Promise<void>;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onSignIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      await onSignIn();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setAuthError(err?.message || 'Failed to sign in with Google. Please check popup permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between selection:bg-stone-200">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <span className="font-semibold text-lg text-stone-900 tracking-tight">
            Gemini Reflection
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 px-3 py-1.5 rounded-full shadow-xs">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>User-Isolated Firestore Storage</span>
        </div>
      </header>

      {/* Main Hero & Auth Section */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-200/70 text-stone-800 text-xs font-medium mb-6">
          <BrainCircuit className="w-4 h-4 text-stone-700" />
          <span>Multi-Turn Journaling & AI Processing</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 max-w-3xl leading-[1.15]">
          A private space for your reflections, enlightened by Gemini.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-stone-600 max-w-2xl leading-relaxed">
          Write multi-turn journal entries, explore thoughtful questions, extract core themes,
          and discover actionable insights. Stored securely with strictly isolated Firestore permissions.
        </p>

        {/* Authentication Action */}
        <div className="mt-10 w-full max-w-md flex flex-col items-center gap-4">
          <button
            id="google-signin-btn"
            type="button"
            disabled={isLoading}
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-stone-900 text-white rounded-xl font-medium text-sm sm:text-base hover:bg-stone-800 active:scale-[0.99] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating with Google...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-1.9.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
                <span>Continue with Google Sign-In</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
              </>
            )}
          </button>

          {authError && (
            <div className="w-full p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-left">
              {authError}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Lock className="w-3.5 h-3.5 text-stone-400" />
            <span>Federated Identity: Zero password storage on custom servers.</span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 w-full text-left">
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-stone-900 text-sm">Owner-Bound Isolation</h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Firestore security rules enforce strict user-id match on every read and write. No cross-user access.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-stone-900 text-sm">Gemini 3.6 Flash Engine</h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Multi-turn conversational reflections with an automated high-availability fallback protocol.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-stone-900 text-sm">Continuous History</h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              All journal thoughts, themes, and summaries are cataloged with tags and instant search capability.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full px-6 py-6 border-t border-stone-200/80 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Compliant with Cloud Run AI Challenge Security Protocols</span>
        </div>
        <span>Built with Google AI Studio & Cloud Firestore</span>
      </footer>
    </div>
  );
};
