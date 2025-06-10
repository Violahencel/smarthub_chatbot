import { useState, useEffect, forwardRef } from 'react';
import {
  DocumentIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
  PhotoIcon,
  FolderIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon as ChevronRightIcon2
} from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/16/solid';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  url?: string;
  children?: FileItem[];
  itemCount?: number;
}

interface FileListProps {
  items: FileItem[];
  onFolderClick: (file: FileItem) => Promise<void>;
  onFileDownload: (filePath: string) => Promise<void>;
  onFolderDownload: (dirPath: string) => Promise<void>;
  onDelete: (folderPath: string, paths?: string[]) => Promise<void>;
  expandedFolders: Set<string>;
  level?: number;
  onSelectAll?: () => void;
  onGetChecked?: () => FileItem[];
  onSelectionChange?: (count: number) => void;
  onFileClick?: (file: FileItem) => void;
}

const FileList = forwardRef(({
  items,
  onFolderClick,
  onFileDownload,
  onFolderDownload,
  onDelete,
  expandedFolders,
  level = 0,
  onSelectAll,
  onGetChecked,
  onSelectionChange,
  onFileClick
}: FileListProps, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = level === 0 ? items.slice(startIndex, endIndex) : items;

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

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return <DocumentTextIcon className="h-5 w-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <DocumentChartBarIcon className="h-5 w-5 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return <PhotoIcon className="h-5 w-5 text-purple-500" />;
      case 'txt':
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const handleCheckboxChange = (file: FileItem) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(file.path)) {
      newCheckedItems.delete(file.path);
    } else {
      newCheckedItems.add(file.path);
    }
    setCheckedItems(newCheckedItems);
    onSelectionChange?.(newCheckedItems.size);
  };

  const handleSelectAll = () => {
    const newCheckedItems = new Set(currentItems.map(item => item.path));
    setCheckedItems(newCheckedItems);
    onSelectionChange?.(newCheckedItems.size);
  };

  // Clear selected items when items array changes
  useEffect(() => {
    setCheckedItems(new Set());
  }, [itemsPerPage]);

  // Expose methods to parent
  useEffect(() => {
    if (ref) {
      (ref as any).current = {
        onSelectAll: handleSelectAll,
        onGetChecked: () => items.filter(item => checkedItems.has(item.path))
      };
    }
  }, [checkedItems, items, ref]);

  return (
    <div>
      <div className="divide-y divide-gray-200">
        {currentItems.map((file) => {
          const isExpanded = expandedFolders.has(file.path);

          return (
            <div key={file.path}>
              <div
                className={`px-6 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-sm ${file.isDirectory ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`}
                style={{ paddingLeft: `${level * 20 + 24}px` }}
                onClick={(e) => {
                  // Don't open if clicking on checkbox or action buttons
                  if ((e.target as HTMLElement).closest('input[type="checkbox"]') || 
                      (e.target as HTMLElement).closest('button')) {
                    return;
                  }
                  if (file.isDirectory) {
                    onFolderClick(file);
                  } else if (onFileClick) {
                    onFileClick(file);
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                    checked={checkedItems.has(file.path)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleCheckboxChange(file);
                    }}
                  />
                  {file.isDirectory ? (
                    <>
                      <ChevronRightIcon
                        className={`h-5 w-5 text-yellow-500 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                      <FolderIcon className="h-5 w-5 text-yellow-500" />
                    </>
                  ) : (
                    getFileIcon(file.name)
                  )}
                  <span className={`${file.isDirectory ? 'text-yellow-800 font-medium' : 'text-gray-900'}`}>
                    {file.name}
                    {file.isDirectory && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({file.itemCount || 0} items)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{formatDate(file.modified)}</span>
                  </div>
                  <div
                    className="flex space-x-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {file.isDirectory ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onFolderDownload(file.path)}}
                          className="text-gray-500 hover:text-purple-600 p-1"
                          title="Download as ZIP"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(file.path)}}
                          className="text-gray-500 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onFileDownload(file.path)}}
                          className="text-gray-500 hover:text-green-600 p-1"
                          title="Download file"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(file.path)}}
                          className="text-gray-500 hover:text-red-600 p-1"
                          title="Delete file"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {file.isDirectory && isExpanded && file.children && (
                <FileList
                  items={file.children}
                  onFolderClick={onFolderClick}
                  onFileDownload={onFileDownload}
                  onFolderDownload={onFolderDownload}
                  onDelete={onDelete}
                  expandedFolders={expandedFolders}
                  level={level + 1}
                  onFileClick={onFileClick}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls - Only show at root level */}
      {level === 0 && items.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-sm text-gray-700">items per page</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-1 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-1 rounded-md ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <ChevronRightIcon2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default FileList; 