import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import MaintainanceMode from '@/components/Admin/MaintainanceMode';

interface Command {
    id: string;
    name: string;
    command: string;
    status: 'running' | 'stopped';
    pid?: number;
}

interface Notification {
    message: string;
    type: 'success' | 'error';
}

// Helper function to parse commands from environment variables
const getCommandsFromEnv = (): Command[] => {
    try {
        const commandsJson = process.env.NEXT_PUBLIC_COMMANDS;
        if (commandsJson) {
            return JSON.parse(commandsJson);
        }
    } catch (error) {
        console.error('Failed to parse commands from environment variables:', error);
    }

    // Fallback default commands
    return [
        {
            id: '1',
            name: 'Fileprep Main Service',
            command: 'D:/cursor/fileprep_prod/fileprepbot|conda activate fileprep_env|mainbot.py',
            status: 'stopped'
        },
        {
            id: '2',
            name: 'Project B Script',
            command: 'D:/project_b|venv/Scripts/activate|run.py',
            status: 'stopped'
        },
        {
            id: '3',
            name: 'Project C Script',
            command: 'E:/project_c|venv/Scripts/activate|start.py',
            status: 'stopped'
        }
    ];
};

export default function ServiceManager() {
    const [commands, setCommands] = useState<Command[]>(getCommandsFromEnv());
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
    const [notification, setNotification] = useState<Notification | null>(null);

    // Show notification for 4 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Check status of processes on load
    useEffect(() => {
        const checkProcessStatus = async () => {
            try {
                const response = await fetch('/api/command', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'status'
                    }),
                });

                const data = await response.json();
                if (data.success && data.processes) {
                    // Update command status based on running processes
                    setCommands(prev => prev.map(cmd => ({
                        ...cmd,
                        status: data.processes[cmd.id] ? 'running' : 'stopped'
                    })));
                }
            } catch (error) {
                console.error('Failed to check process status:', error);
            }
        };

        checkProcessStatus();
    }, []);

    const handleStart = async (command: Command) => {
        setLoading(prev => ({ ...prev, [command.id]: true }));
        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commandId: command.id,
                    action: 'start',
                    command: command.command,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setCommands(prev =>
                    prev.map(cmd =>
                        cmd.id === command.id
                            ? { ...cmd, status: 'running', pid: data.pid }
                            : cmd
                    )
                );
                setNotification({ message: `Started ${command.name}`, type: 'success' });
            } else {
                setNotification({ message: `Failed to start ${command.name}`, type: 'error' });
            }
        } catch (error) {
            console.error('Failed to start service:', error);
            setNotification({ message: `Failed to start ${command.name}`, type: 'error' });
        } finally {
            setLoading(prev => ({ ...prev, [command.id]: false }));
        }
    };

    const handleStop = async (command: Command) => {
        setLoading(prev => ({ ...prev, [command.id]: true }));
        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commandId: command.id,
                    action: 'stop',
                }),
            });

            const data = await response.json();
            if (data.success) {
                setCommands(prev =>
                    prev.map(cmd =>
                        cmd.id === command.id
                            ? { ...cmd, status: 'stopped', pid: undefined }
                            : cmd
                    )
                );
                setNotification({ message: `Stopped ${command.name}`, type: 'success' });
            } else {
                setNotification({ message: `Failed to stop ${command.name}`, type: 'error' });
            }
        } catch (error) {
            console.error('Failed to stop service:', error);
            setNotification({ message: `Failed to stop ${command.name}`, type: 'error' });
        } finally {
            setLoading(prev => ({ ...prev, [command.id]: false }));
        }
    };

    // Helper function to get script name from command
    const getScriptName = (command: string) => {
        const parts = command.split('|');
        return parts[parts.length - 1];
    };

    const hold_till_work_is_done = true;
    if (hold_till_work_is_done) {
        return (
            <MaintainanceMode title="Service Manager" />
        );
    }

    return (
        <AdminLayout>
            <div className="h-[calc(100vh-3rem)] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold">Service Manager</h1>
                    </div>
                </div>
                
                <div className="flex-1 bg-white rounded-lg shadow p-6">
                    {notification && (
                        <div className={`notification ${notification.type}`}>
                            {notification.message}
                        </div>
                    )}

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Script</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commands.map(command => (
                                    <tr key={command.id}>
                                        <td>{command.name}</td>
                                        <td>{getScriptName(command.command)}</td>
                                        <td>
                                            <span className={`status ${command.status}`}>
                                                {command.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions">
                                                <button
                                                    className={`button ${command.status === 'running' ? 'disabled' : 'primary'}`}
                                                    onClick={() => handleStart(command)}
                                                    disabled={command.status === 'running' || loading[command.id]}
                                                >
                                                    {loading[command.id] ? 'Starting...' : 'Start'}
                                                </button>
                                                <button
                                                    className={`button ${command.status === 'stopped' ? 'disabled' : 'danger'}`}
                                                    onClick={() => handleStop(command)}
                                                    disabled={command.status === 'stopped' || loading[command.id]}
                                                >
                                                    {loading[command.id] ? 'Stopping...' : 'Stop'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .table-container {
                    overflow-x: auto;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }

                th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                }

                .status {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.9em;
                }

                .status.running {
                    background-color: #e6f7e6;
                    color: #52c41a;
                }

                .status.stopped {
                    background-color: #fff1f0;
                    color: #ff4d4f;
                }

                .actions {
                    display: flex;
                    gap: 8px;
                }

                .button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }

                .button.primary {
                    background-color: #1890ff;
                    color: white;
                }

                .button.danger {
                    background-color: #ff4d4f;
                    color: white;
                }

                .button.disabled {
                    background-color: #d9d9d9;
                    cursor: not-allowed;
                }

                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 10px 15px;
                    border-radius: 4px;
                    color: white;
                    font-size: 14px;
                    z-index: 1000;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }

                .notification.success {
                    background-color: #0078d4;
                    border-left: 4px solid #106ebe;
                }

                .notification.error {
                    background-color: #a4262c;
                    border-left: 4px solid #8e1b21;
                }
            `}</style>
        </AdminLayout>
    );
} 