import React, { useState, ReactNode } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  ClipboardDocumentListIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import { LoadingOverlay } from '@/components/LoadingOverlay';

interface MenuItem {
  name: string;
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>;
  path: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Prompts',
    icon: DocumentIcon,
    path: '/promptsmanager',
    children: []
  },
  {
    name: 'File Browser',
    icon: FolderIcon,
    path: '/filebrowser',
    children: []
  }
];

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <div className="min-h-screen bg-gray-100">
      <LoadingOverlay />
      <Toaster position="top-right" />
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div
          className={`bg-gray-800 text-white transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'
            } flex flex-col`}
        >
          {/* Logo/Header */}
          <div className="h-16 flex items-center justify-between px-4 bg-gray-900">
            {!isCollapsed && <span className="font-semibold text-lg">Admin Panel</span>}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1 hover:bg-gray-700 rounded ${isCollapsed ? 'mx-auto' : ''}`}
            >
              {isCollapsed ?
                <ChevronRightIcon className="w-5 h-5" /> :
                <ChevronLeftIcon className="w-5 h-5" />}
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex-1 py-4">
            {menuItems.map((item) => (
              <div key={item.name} className="mb-2">
                <Link
                  href={item.path}
                  className={`w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors ${currentPath === item.path ? 'bg-gray-700' : ''
                    }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="ml-3 truncate">{item.name}</span>}
                </Link>
                {/* Space for future sub-items */}
                {!isCollapsed && item.children && item.children.length > 0 && (
                  <div className="ml-8 mt-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.path}
                        className={`w-full flex items-center px-4 py-2 hover:bg-gray-700 text-sm ${currentPath === child.path ? 'bg-gray-700' : ''
                          }`}
                      >
                        <child.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="ml-3 truncate">{child.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminLayout; 