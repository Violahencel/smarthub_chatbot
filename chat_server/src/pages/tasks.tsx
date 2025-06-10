import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import MaintainanceMode from '@/components/Admin/MaintainanceMode';

type OrderProcessingTask = {
  _id: string;
  url: string;
  original_filename: string;
  file_type: string;
  id: string;
  folder_path?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
};

export default function Tasks() {
  const [tasks, setTasks] = useState<OrderProcessingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const response = await fetch('/api/dynamic/aido_order_processing');
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        const data = await response.json();
        setTasks(data.records || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching tasks:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, []);

  const hold_till_work_is_done = true;
    if (hold_till_work_is_done) {
        return (
            <MaintainanceMode title="Tasks Manager" />
        );
    }

  return (
    <AdminLayout>
      <Head>
        <title>Order Processing Tasks</title>
      </Head>
      <div className="h-[calc(100vh-3rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Tasks</h1>
          </div>
        </div>
        
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <div className="grid gap-4">
            {loading && <p className="text-gray-500">Loading tasks...</p>}
            {error && <p className="text-red-500">{error}</p>}
            
            {!loading && !error && (
              <div className="overflow-x-auto shadow-sm rounded-sm">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-3 text-left font-medium text-gray-700">ID</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-700">Filename</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-700">File Type</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-700">Status</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-700">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr>
                        <td className="py-2 px-3 text-gray-500 text-center" colSpan={5}>No tasks found</td>
                      </tr>
                    ) : (
                      tasks.map((task) => (
                        <tr key={task._id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-2 px-3">{task.id || task._id.substring(0, 8)}</td>
                          <td className="py-2 px-3">
                            <a 
                              href={task.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:underline"
                            >
                              {task.original_filename || '-'}
                            </a>
                          </td>
                          <td className="py-2 px-3">{task.file_type || '-'}</td>
                          <td className="py-2 px-3">
                            <span 
                              className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'failed' ? 'bg-red-100 text-red-800' :
                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {task.status || 'pending'}
                            </span>
                          </td>
                          <td className="py-2 px-3">{task.createdAt ? new Date(task.createdAt).toLocaleString() : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
