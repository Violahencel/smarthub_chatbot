import React, { useEffect, useState } from 'react';
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
import AdminLayout from '@/components/layout/AdminLayout';
import 'react-markdown-editor-lite/lib/index.css';
import { FileAccessManager } from '@lib/file_access_manager';
import { settingsCache } from '@/utils/settingsCache';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useLoading, withLoading } from '@/contexts/LoadingContext';
import { v4 as uuidv4 } from 'uuid';

// Initialize markdown parser
const mdParser = new MarkdownIt({
  breaks: true,
  html: true,
  linkify: true,
});

interface PromptFile {
  name: string;
  path: string;
  prompt_scripts?: string[];
}

interface Action {
  name: string;
  prompts: PromptFile[];
  prompt_scripts?: string[];
}

interface Folder {
  folder: string;
  prompts: PromptFile[];
}

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Action</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const PromptsManager: React.FC = () => {
  const router = useRouter();
  const { startLoading, stopLoading } = useLoading();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('default');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newPromptName, setNewPromptName] = useState<string>('');
  const [isCreatingAction, setIsCreatingAction] = useState<boolean>(false);
  const [newActionName, setNewActionName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [scripts, setScripts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'prompts' | 'scripts'>('prompts');

  const md = new MarkdownIt();

  const fetchFolders = async () => {
    await withLoading(async () => {
      const response = await fetch('/api/v2/prompts');
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch folders' }));
        throw new Error(error.message || 'Failed to fetch folders');
      }
      const data = await response.json();
      setFolders(data.folders);

      // If we have folders but no selected folder, select the first one
      if (data.folders.length > 0 && !selectedFolder) {
        const firstFolder = data.folders[0].folder;
        setSelectedFolder(firstFolder);
        // Fetch active prompts for initial folder
        await fetchFolderState(firstFolder);
      }
    }, { startLoading, stopLoading });
  };

  // Single function to fetch folder state (folders list + active prompts)
  const fetchFolderState = async (folder: string) => {
    try {
      startLoading();
      const foldersResponse = await fetch('/api/v2/prompts');

      if (!foldersResponse.ok) {
        const error = await foldersResponse.json().catch(() => ({ message: 'Failed to fetch folders' }));
        throw new Error(error.message || 'Failed to fetch folders');
      }

      const foldersData = await foldersResponse.json();

      const updatedFolders = foldersData.folders.map((f: Folder) => {
        if (f.folder === folder) {
          return {
            ...f,
            prompts: f.prompts.map(p => ({
              ...p,
              prompt_scripts: [] // Default empty array for prompt scripts
            }))
          };
        }
        return f;
      });

      setFolders(updatedFolders);
    } catch (err) {
      console.error('Error fetching folder state:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch folder state');
    } finally {
      stopLoading();
    }
  };

  const fetchScripts = async () => {
    try {
      const response = await fetch('/api/v2/prompts/scripts');
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch scripts' }));
        throw new Error(error.message || 'Failed to fetch scripts');
      }
      const data = await response.json();
      setScripts(data.scripts);
    } catch (error) {
      console.error('Error fetching scripts:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch scripts');
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchScripts();
  }, []);

  const handleFolderSelect = (folder: string) => {
    if (content !== originalContent) {
      setPendingAction(() => () => {
        setSelectedFolder(folder);
        setSelectedPrompt(null);
        setContent('');
        setOriginalContent('');
        setIsCreatingNew(false);

        const firstAction = folders.find(f => f.folder === folder)?.prompts[0]?.name || 'default';
        setSelectedAction(firstAction);
        fetchFolderState(folder);
      });
      setConfirmModal(true);
      return;
    }

    setSelectedFolder(folder);
    setSelectedPrompt(null);
    setContent('');
    setOriginalContent('');
    setIsCreatingNew(false);

    const firstAction = folders.find(f => f.folder === folder)?.prompts[0]?.name || 'default';
    setSelectedAction(firstAction);
    fetchFolderState(folder);
  };

  const handleActionSelect = (action: string) => {
    if (content !== originalContent) {
      setPendingAction(() => () => {
        if (selectedFolder) {
          setSelectedAction(action);
          setSelectedPrompt(null);
          setContent('');
          setOriginalContent('');
          setIsCreatingNew(false);
          fetchFolderState(selectedFolder);
        }
      });
      setConfirmModal(true);
      return;
    }

    if (selectedFolder) {
      setSelectedAction(action);
      setSelectedPrompt(null);
      setContent('');
      setOriginalContent('');
      setIsCreatingNew(false);
      fetchFolderState(selectedFolder);
    }
  };

  const handlePromptSelect = async (prompt: PromptFile) => {
    try {
      startLoading();
      const promptResponse = await fetch(`/api/v2/prompts?folder=${selectedFolder}&filename=${prompt.name}`);
      if (!promptResponse.ok) {
        const error = await promptResponse.json().catch(() => ({ message: 'Failed to fetch prompt content' }));
        throw new Error(error.message || 'Failed to fetch prompt content');
      }
      const data = await promptResponse.json();
      setContent(data.content);
      setOriginalContent(data.content);
      setSelectedPrompt(prompt);
    } catch (error) {
      console.error('Error fetching prompt content:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load prompt content');
    } finally {
      stopLoading();
    }
  };

  const handleSave = async () => {
    if (!selectedFolder || !selectedPrompt) {
      toast.error('No prompt selected');
      return;
    }

    try {
      startLoading();
      const response = await fetch('/api/v2/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder: selectedFolder,
          filename: selectedPrompt.name,
          content,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to save prompt' }));
        throw new Error(error.message || 'Failed to save prompt');
      }
      toast.success('Prompt saved successfully');
      setOriginalContent(content);
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save prompt');
    } finally {
      stopLoading();
    }
  };

  const handleNewPrompt = () => {
    setNewPromptName('');
    setIsCreatingNew(true);
  };

  const handleNewAction = () => {
    if (!selectedFolder) {
      setError('Please select a folder first');
      return;
    }
    setIsCreatingAction(true);
    setNewActionName('');
  };

  const handleCreatePrompt = async () => {
    if (!selectedFolder || !newPromptName) {
      toast.error('Please select a folder and enter a prompt name');
      return;
    }

    try {
      startLoading();
      const response = await fetch('/api/v2/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder: selectedFolder,
          filename: newPromptName,
          content: '',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create prompt' }));
        throw new Error(error.message || 'Failed to create prompt');
      }
      await fetchFolderState(selectedFolder);
      setIsCreatingNew(false);
      setNewPromptName('');
      toast.success('Prompt created successfully');
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create prompt');
    } finally {
      stopLoading();
    }
  };

  const handleCreateAction = async () => {
    if (!newActionName) {
      toast.error('Please enter an action name');
      return;
    }

    const sanitizedName = newActionName.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();

    try {
      startLoading();
      const response = await fetch('/api/v2/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: selectedFolder,
          filename: 'system_prompt.md',
          content: '',
          action: sanitizedName
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create action' }));
        throw new Error(error.message || 'Failed to create action');
      }
      await fetchFolderState(selectedFolder);
      setIsCreatingAction(false);
      setNewActionName('');
      toast.success('Action created successfully');
    } catch (err) {
      console.error('Error creating action:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create action');
    } finally {
      stopLoading();
    }
  };

  const handleDeletePrompt = async () => {
    if (!selectedFolder || !selectedPrompt) {
      toast.error('No prompt selected');
      return;
    }

    try {
      startLoading();
      const response = await fetch(`/api/v2/prompts?folder=${selectedFolder}&filename=${selectedPrompt.name}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete prompt' }));
        throw new Error(error.message || 'Failed to delete prompt');
      }
      await fetchFolderState(selectedFolder);
      setSelectedPrompt(null);
      setContent('');
      toast.success('Prompt deleted successfully');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete prompt');
    } finally {
      stopLoading();
    }
  };

  const handleConfirm = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setConfirmModal(false);
  };

  const handleCancel = () => {
    setPendingAction(null);
    setConfirmModal(false);
  };

  const handleScriptSelect = async (scriptName: string) => {
    window.open(`/scripteditor?scriptname=${scriptName}`, '_blank');
  };

  const currentFolder = folders.find(f => f.folder === selectedFolder);
  const currentPrompts = currentFolder?.prompts || [];

  return (
    <AdminLayout>
      <p className="text-red-600 text-sm absolute bottom-0 left-0 w-full text-center bg-red-500 text-white z-50 py-2">
        Prompts and configurations are <b>NOT backed up</b>. Any changes you make is irreversible, save your changes only when you know it is good. Alternately, you may create a new prompt for temporary use until you are OK for production.
      </p>
      <div className="container mx-auto px-4 pb-8">
        <h1 className="text-2xl font-bold mb-6">Prompts Manager</h1>

        {error && (
          <div key="error" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-7 gap-6">
          <div className="md:col-span-2 lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-6">
                {/* Tab Controls */}
                <div className="flex border-b border-gray-200">
                  <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'prompts'
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                    onClick={() => setActiveTab('prompts')}
                  >
                    Prompts
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'scripts'
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                    onClick={() => setActiveTab('scripts')}
                  >
                    Scripts
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'prompts' ? (
                  <>
                    <div>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <select
                            id="bot-select"
                            className="w-full px-3 py-1.5 text-base border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent bg-white appearance-none text-gray-900"
                            value={selectedFolder}
                            onChange={(e) => handleFolderSelect(e.target.value)}
                          >
                            <option value="" disabled className="text-gray-500">Select Bot</option>
                            {folders.map((folder) => (
                              <option key={`folder-${folder.folder}`} value={folder.folder} className="text-gray-900">
                                {folder.folder}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedFolder && (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-base font-medium text-gray-600">Prompts</label>
                            <button
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              onClick={handleNewPrompt}
                              disabled={isCreatingNew}
                              title="New Prompt"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>


                        {isCreatingNew ? (
                          <div key="create-prompt" className="mb-3">
                            <input
                              type="text"
                              className="w-full px-2.5 py-1 text-base border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent mb-2"
                              placeholder="Enter prompt name"
                              value={newPromptName}
                              onChange={(e) => setNewPromptName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreatePrompt();
                                if (e.key === 'Escape') {
                                  setIsCreatingNew(false);
                                  setNewPromptName('');
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                className="px-2.5 py-1 text-base text-white bg-gray-700 rounded hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500"
                                onClick={handleCreatePrompt}
                              >
                                Create
                              </button>
                              <button
                                className="px-2.5 py-1 text-base text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300"
                                onClick={() => {
                                  setIsCreatingNew(false);
                                  setNewPromptName('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <div className="space-y-0.5">
                          {currentPrompts.map((prompt) => (
                            <div
                              key={`prompt-${prompt.name}`}
                              className={`px-2.5 py-1.5 text-base rounded cursor-pointer flex items-center justify-between group ${selectedPrompt?.name === prompt.name
                                ? 'bg-gray-100 border border-gray-200'
                                : 'hover:bg-gray-50 border border-transparent'
                                }`}
                              onClick={() => handlePromptSelect(prompt)}
                            >
                              <span className="truncate">{prompt.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>

                    <div className="mb-4">
                      <label className="font-medium text-gray-600 block mb-1">Active Scripts</label>
                      <textarea
                        readOnly
                        value={currentFolder?.prompts.find(p => p.name === selectedAction)?.prompt_scripts?.join('\n') || ''}
                        className="w-full px-2.5 py-1.5 text-base border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent bg-gray-50 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="font-medium text-gray-600 block mb-1">Scripts</label>
                      <div className="border border-gray-200 rounded overflow-hidden">
                        <div className="h-[250px] overflow-y-auto">
                          {scripts.map((script) => (
                            <div
                              key={script}
                              className={`px-2.5 py-1.5 text-base cursor-pointer hover:bg-gray-200`}
                              onClick={() => handleScriptSelect(script)}
                            >
                              {script}
                            </div>
                          ))}
                          {scripts.length === 0 && (
                            <div className="px-2.5 py-1.5 text-xs text-gray-500">
                              No scripts available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-4 lg:col-span-5">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              {selectedPrompt ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">{selectedPrompt.name}</h2>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1.5 text-sm text-white bg-gray-700 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleSave}
                        disabled={content === originalContent}
                      >
                        Save
                      </button>
                      <button
                        className="px-3 py-1.5 text-sm text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={handleDeletePrompt}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <MdEditor
                    style={{ height: '500px' }}
                    renderHTML={(text) => mdParser.render(text)}
                    onChange={({ text }) => setContent(text)}
                    value={content}
                    view={{ menu: true, md: true, html: false }}
                  />
                </>
              ) : (
                <div className="text-center text-gray-500 text-sm">
                  Select a prompt to edit
                </div>
              )}
            </div>
          </div>
        </div>

        <ConfirmModal
          isOpen={confirmModal}
          message="You have unsaved changes. Do you want to continue?"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </div>
    </AdminLayout>
  );
};

export default PromptsManager; 