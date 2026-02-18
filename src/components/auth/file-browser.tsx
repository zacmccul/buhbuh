/**
 * Component for browsing and viewing encrypted files
 * Shows available content categories and allows downloading/viewing decrypted files
 */

import { useState, useEffect } from 'react';
import { useDecryption } from './use-decryption';

interface ContentCategoryConfig {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

const CATEGORIES: ContentCategoryConfig[] = [
  { id: 'poems', label: 'Poems', emoji: '📝', description: 'Poetry collection' },
  { id: 'music', label: 'Music', emoji: '🎵', description: 'Audio files' },
  { id: 'art', label: 'Art', emoji: '🎨', description: 'Artwork' },
  { id: 'pictures', label: 'Pictures', emoji: '📷', description: 'Photography' },
  { id: 'writing', label: 'Writing', emoji: '✍️', description: 'Written works' },
];

interface FileBrowserProps {
  password: string;
  onFileDecrypted: (file: { name: string; content: string | Uint8Array; mimeType: string }) => void;
}

export function FileBrowser({ password, onFileDecrypted }: FileBrowserProps) {
  const decryption = useDecryption();
  const [selectedCategory, setSelectedCategory] = useState<string>('poems');
  const [files, setFiles] = useState<Record<string, string[]>>({});
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Load encrypted file list on mount
  useEffect(() => {
    const loadFiles = async () => {
      setLoadingFiles(true);
      const fileMap: Record<string, string[]> = {};

      for (const category of CATEGORIES) {
        try {
          // Try to fetch a manifest or scan the directory
          // For now, we'll assume files are listed via a simple manifest
          const response = await fetch(`/api/files/${category.id}?format=json`);
          if (response.ok) {
            fileMap[category.id] = await response.json();
          }
        } catch {
          // Category might be empty
          fileMap[category.id] = [];
        }
      }

      setFiles(fileMap);
      setLoadingFiles(false);
    };

    loadFiles();
  }, []);

  const handleFileSelect = async (filePath: string) => {
    try {
      const file = await decryption.decryptFile(filePath, password);
      if (file) {
        onFileDecrypted(file);
      }
    } catch (err) {
      console.error('Failed to decrypt file:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">buhbuh</h1>
          <p className="text-slate-300">Explore encrypted content</p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-6 rounded-lg border-2 transition-all text-center ${
                selectedCategory === category.id
                  ? 'bg-blue-600/20 border-blue-500'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="text-4xl mb-2">{category.emoji}</div>
              <h3 className="text-lg font-semibold text-white">{category.label}</h3>
              <p className="text-sm text-slate-400">{category.description}</p>
            </button>
          ))}
        </div>

        {/* File List */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {CATEGORIES.find(c => c.id === selectedCategory)?.label} Files
          </h2>

          {loadingFiles ? (
            <div className="text-center py-8 text-slate-400">
              <div className="animate-spin text-2xl mb-2">⏳</div>
              <p>Loading files...</p>
            </div>
          ) : (files[selectedCategory]?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {files[selectedCategory]?.map(filePath => (
                <FileListItem
                  key={filePath}
                  filePath={filePath}
                  isLoading={decryption.isLoading}
                  onSelect={handleFileSelect}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <p>No files in this category</p>
            </div>
          )}
        </div>

        {/* Error display */}
        {decryption.error && (
          <div className="mt-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400">{decryption.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface FileListItemProps {
  filePath: string;
  isLoading: boolean;
  onSelect: (filePath: string) => void;
}

function FileListItem({ filePath, isLoading, onSelect }: FileListItemProps) {
  const fileName = filePath.split('/').pop() || filePath;
  const fileExtension = fileName.split('.').pop() || '';

  return (
    <button
      onClick={() => onSelect(filePath)}
      disabled={isLoading}
      className="w-full p-4 text-left bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-slate-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-xl">📄</span>
        <div>
          <p className="text-white font-medium">{fileName}</p>
          <p className="text-xs text-slate-400">{fileExtension.toUpperCase()}</p>
        </div>
      </div>
      <span className="text-slate-400">→</span>
    </button>
  );
}
