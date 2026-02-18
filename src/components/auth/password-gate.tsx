/**
 * Password authentication gate component
 * Displays a simple password input to unlock encrypted content
 */

import { useState, FormEvent, ChangeEvent } from 'react';

interface PasswordGateProps {
  /** Callback when correct password is submitted */
  onUnlock: (password: string) => void;
  /** Optional message to display */
  message?: string;
  /** Whether to show as loading */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Callback to clear error */
  onErrorClear?: () => void;
}

export function PasswordGate({
  onUnlock,
  message = 'Enter password to access content',
  isLoading = false,
  error = null,
  onErrorClear,
}: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.trim()) {
      onUnlock(password);
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.currentTarget.value);
    if (error && onErrorClear) {
      onErrorClear();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 text-4xl">🔐</div>
            <h1 className="text-2xl font-bold text-white mb-2">buhbuh</h1>
            <p className="text-slate-300">{message}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter password..."
                disabled={isLoading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {show ? '🙈' : '👁️'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Verifying...
                </>
              ) : (
                <>Unlock Content</>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-slate-400">
            <p>Your content is encrypted end-to-end</p>
            <p>Password is never transmitted anywhere</p>
          </div>
        </div>

        {/* Background decoration */}
        <div className="mt-8 text-center text-slate-600 text-sm">
          🔒 All files are AES-256-GCM encrypted with your password
        </div>
      </div>
    </div>
  );
}
