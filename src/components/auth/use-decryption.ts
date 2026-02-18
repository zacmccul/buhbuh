/**
 * Hook for managing encrypted file decryption
 * Provides password validation and file loading
 */

import { useState, useCallback } from 'react';
import { decryptFromJSON } from '@/utils/crypto-utils';

export interface DecryptedFile {
  name: string;
  path: string;
  content: string | Uint8Array;
  mimeType: string;
}

interface UseDecryptionState {
  isLoading: boolean;
  error: string | null;
  password: string;
  isAuthenticated: boolean;
  decryptedFiles: Map<string, DecryptedFile>;
}

/**
 * Hook for handling encryption/decryption operations
 * @param correctPassword - The correct password for verification
 */
export function useDecryption(correctPassword?: string) {
  const [state, setState] = useState<UseDecryptionState>({
    isLoading: false,
    error: null,
    password: '',
    isAuthenticated: false,
    decryptedFiles: new Map(),
  });

  const verifyPassword = useCallback((password: string): boolean => {
    if (correctPassword) {
      return password === correctPassword;
    }
    // If no correct password provided, we can't verify in advance
    // Verification happens during decryption
    return true;
  }, [correctPassword]);

  const setPassword = useCallback((password: string) => {
    setState(prev => ({
      ...prev,
      password,
      isAuthenticated: verifyPassword(password),
      error: null,
    }));
  }, [verifyPassword]);

  const decryptFile = useCallback(
    async (
      encryptedPath: string,
      password: string
    ): Promise<DecryptedFile | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(encryptedPath);
        if (!response.ok) {
          throw new Error(`Failed to load encrypted file: ${response.statusText}`);
        }

        const jsonText = await response.text();
        const decrypted = await decryptFromJSON(jsonText, password);

        const fileName = encryptedPath.split('/').pop()?.replace('.enc', '') || 'file';
        const mimeType = getMimeType(fileName);

        const file: DecryptedFile = {
          name: fileName,
          path: encryptedPath,
          content: decrypted,
          mimeType,
        };

        setState(prev => {
          const newFiles = new Map(prev.decryptedFiles);
          newFiles.set(encryptedPath, file);
          return {
            ...prev,
            decryptedFiles: newFiles,
            isLoading: false,
          };
        });

        return file;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown decryption error';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw err;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      password: '',
      isAuthenticated: false,
      decryptedFiles: new Map(),
    });
  }, []);

  return {
    ...state,
    setPassword,
    decryptFile,
    clearError,
    reset,
  };
}

/**
 * Determine MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    svg: 'image/svg+xml',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}
