import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FileList from '../components/FileList';
import AdminLayout from '@/components/layout/AdminLayout';
import { useLoading, withLoading } from '@/contexts/LoadingContext';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  url?: string;
  children?: FileItem[];
}

const FileBrowser = () => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [checkedCount, setCheckedCount] = useState(0);
  const fileListRef = useRef<any>(null);
  const { startLoading, stopLoading } = useLoading();
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  
  const fetchDirectory = async (path: string = '') => {
    return withLoading(async () => {
      const response = await axios.get(`/api/files?path=${encodeURIComponent(path)}&nocachecode=${uuidv4()}`);
      return response.data;
    }, { startLoading, stopLoading });
  };

  const handleFolderClick = async (file: FileItem) => {
    if (expandedFolders.has(file.path)) {
      const newExpanded = new Set(expandedFolders);
      newExpanded.delete(file.path);
      setExpandedFolders(newExpanded);
    } else {
      const newExpanded = new Set(expandedFolders);
      newExpanded.add(file.path);
      setExpandedFolders(newExpanded);

      if (!file.children) {
        const data = await fetchDirectory(file.path);
        const updatedFiles = files.map(f => {
          if (f.path === file.path) {
            return { ...f, children: data };
          }
          return f;
        });
        setFiles(updatedFiles);
      }
    }
  };

  const handleDownload = async (filePath: string) => {
    return withLoading(async () => {
      const response = await axios.get(`/api/files?path=${encodeURIComponent(filePath)}&download=true&nocachecode=${uuidv4()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filePath.split('/').pop() || 'file');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }, { startLoading, stopLoading });
  };

  const handleDelete = async (folderPath: string, paths?: string[]) => {
    return withLoading(async () => {
      if (paths) {
        if(paths.length === 0) return;
        const confirmDelete = window.confirm(`WARNING: This action is irreversible. Are you sure you want to delete all the selected folders?`);
        if (!confirmDelete) return;
        await axios.delete(`/api/files?nocachecode=${uuidv4()}`, { data: { paths } });
        setFiles(files.filter(f => !paths.includes(f.path)));
      } else {
        if (!folderPath) return;
        const confirmDelete = window.confirm(`WARNING: This action is irreversible. Are you sure you want to delete the folder: ${folderPath}?`);
        if (!confirmDelete) return;
        await axios.delete(`/api/files?path=${encodeURIComponent(folderPath)}&nocachecode=${uuidv4()}`);
        setFiles(files.filter(f => f.path !== folderPath));
      }
    }, { startLoading, stopLoading });
  };

  const handleDownloadDirectory = async (dirPath: string) => {
    return withLoading(async () => {
      const response = await axios.get(`/api/files?path=${encodeURIComponent(dirPath)}&zip=true&nocachecode=${uuidv4()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dirPath.split('/').pop() || 'directory'}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }, { startLoading, stopLoading });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderFileItem = (file: FileItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(file.path);

    return (
      <div key={file.path}>
        <div
          className={`px-6 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-sm ${file.isDirectory ? 'bg-yellow-50 hover:bg-yellow-100' : ''
            }`}
          style={{ paddingLeft: `${level * 20 + 24}px` }}
          onClick={() => {
            if (file.isDirectory) {
              handleFolderClick(file);
            } else {
              handleFileClick(file);
            }
          }}
        >
          <div className="flex items-center space-x-3">
            {file.isDirectory ? (
              <svg
                className={`h-5 w-5 text-yellow-500 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            )}
            <span className={`${file.isDirectory ? 'text-yellow-800 font-medium' : 'text-gray-900'}`}>
              {file.name}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{formatDate(file.modified)}</span>
            </div>
            <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
              {file.isDirectory ? (
                <button
                  onClick={() => handleDownloadDirectory(file.path)}
                  className="text-gray-500 hover:text-purple-600 p-1"
                  title="Download as ZIP"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              ) : (
                <>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-blue-600 p-1"
                    title="Open file"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </a>
                  <button
                    onClick={() => handleDownload(file.path)}
                    className="text-gray-500 hover:text-green-600 p-1"
                    title="Download file"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {file.isDirectory && isExpanded && file.children && (
          <div>
            {file.children.map(child => renderFileItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleDeleteSelected = async () => {
    if (fileListRef.current && fileListRef.current.onGetChecked) {
      const checkedItems = fileListRef.current.onGetChecked();
      if (checkedItems.length === 0) return;

      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${checkedItems.length} selected item(s)?`
      );
      if (!confirmDelete) return;

      const paths = checkedItems.map((item: FileItem) => item.path);
      await handleDelete("", paths);
      setCheckedCount(0);
    }
  };

  const handleFileClick = async (file: FileItem) => {
    if (file.isDirectory) {
      handleFolderClick(file);
    } else {
      try {
        startLoading();
        const response = await axios.get(`/api/files?path=${encodeURIComponent(file.path)}&content=true&nocachecode=${uuidv4()}`);
        if (response.data.error) {
          toast.error(response.data.error);
          return;
        }
        setFileContent(response.data.content);
        setSelectedFile(file);
      } catch (error: any) {
        console.error('Error loading file content:', error);
        toast.error(error.response?.data?.error || 'Failed to load file content');
      } finally {
        stopLoading();
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      const data = await fetchDirectory();
      setFiles(data);
    };
    init();
  }, []);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-xl font-medium text-gray-900">File Browser</h1>
            </div>

            {/* Breadcrumb */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center text-sm">
                <button
                  onClick={() => {
                    setCurrentPath('');
                    setExpandedFolders(new Set());
                    const init = async () => {
                      const data = await fetchDirectory();
                      setFiles(data);
                    };
                    init();
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Root
                </button>
                <button
                  onClick={() => {
                    if (fileListRef.current && fileListRef.current.onSelectAll) {
                      fileListRef.current.onSelectAll();
                    }
                  }}
                  className="ml-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={checkedCount === 0}
                  className={`ml-4 text-red-600 hover:text-red-800 font-medium ${checkedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Delete Selected ({checkedCount})
                </button>
                {currentPath && (
                  <>
                    <span className="text-gray-400 mx-2">{'>'}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">{currentPath}</span>
                      <button
                        onClick={() => handleDownloadDirectory(currentPath)}
                        className="text-gray-500 hover:text-purple-600 p-1"
                        title="Download current folder as ZIP"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* File list */}
            <FileList
              ref={fileListRef}
              items={files}
              onFolderClick={handleFolderClick}
              onFileDownload={handleDownload}
              onFolderDownload={handleDownloadDirectory}
              onDelete={handleDelete}
              expandedFolders={expandedFolders}
              onSelectionChange={setCheckedCount}
              onFileClick={handleFileClick}
            />

            {/* File Content Modal */}
            {selectedFile && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-3/4 h-3/4 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{selectedFile.name}</h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownload(selectedFile.path)}
                        className="text-gray-500 hover:text-blue-600 p-1"
                        title="Download file"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setFileContent('');
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto bg-gray-50 p-4 rounded">
                    {fileContent ? (
                      <pre className="whitespace-pre-wrap font-mono text-sm">{fileContent}</pre>
                    ) : (
                      <div className="text-gray-500 text-center">No content available</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default FileBrowser; 