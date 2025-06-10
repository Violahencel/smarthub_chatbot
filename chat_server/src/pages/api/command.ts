import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// In-memory storage for process tracking info
const runningProcesses = new Map<string, { batchFilePath: string, uniqueId: string }>();

// Path for storing process data
const PROCESS_DATA_PATH = path.join(process.cwd(), 'process_data.json');

// Load process data from file
async function loadProcessData() {
    try {
        const data = await fs.readFile(PROCESS_DATA_PATH, 'utf-8');
        const processData = JSON.parse(data);
        
        // Restore the runningProcesses map
        Object.entries(processData).forEach(([commandId, info]: [string, any]) => {
            runningProcesses.set(commandId, info);
        });
    } catch (error) {
        // File might not exist yet, that's okay
        console.log('No process data found, starting fresh');
    }
}

// Save process data to file
async function saveProcessData() {
    const processData = Object.fromEntries(runningProcesses.entries());
    await fs.writeFile(PROCESS_DATA_PATH, JSON.stringify(processData, null, 2));
}

// Load process data on server start
loadProcessData().catch(console.error);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { commandId, action, command } = req.body;

        if (action === 'start') {
            // Parse command from .env format
            const [directory, venvPath, scriptPath] = command.split('|');
            
            // Create a unique batch file for this command
            const uniqueId = randomUUID();
            const tempDir = process.env.TEMP || 'C:/temp';
            const batchFilePath = path.join(tempDir, `run_cmd_${uniqueId}.bat`);
            
            // Create batch file content
            const batchContent = `@echo off
title ${uniqueId}
cd /d "${directory}"
call ${venvPath}
python ${scriptPath}
pause`;
            
            // Write the batch file
            await fs.writeFile(batchFilePath, batchContent);
            
            // Execute the batch file
            exec(`start "${uniqueId}" cmd /c "${batchFilePath}"`, (error: Error | null) => {
                if (error) {
                    console.error(`[${commandId}] Failed to start command:`, error);
                }
            });
            
            // Store the batch file path and uniqueId for stopping later
            runningProcesses.set(commandId, { batchFilePath, uniqueId });
            
            // Save the updated process data
            await saveProcessData();

            return res.status(200).json({ 
                success: true, 
                message: 'Command started successfully'
            });

        } else if (action === 'stop') {
            const processInfo = runningProcesses.get(commandId);
            
            if (processInfo) {
                try {
                    // Kill the window by its title
                    exec(`taskkill /fi "WINDOWTITLE eq ${processInfo.uniqueId}" /f`, (error) => {
                        if (error) {
                            console.error(`Failed to kill window:`, error);
                        }
                    });
                    
                    // Clean up the batch file
                    fs.unlink(processInfo.batchFilePath).catch(err => {
                        console.error(`Failed to delete batch file:`, err);
                    });
                    
                    // Remove from tracking
                    runningProcesses.delete(commandId);
                    
                    // Save the updated process data
                    saveProcessData().catch(console.error);
                    
                    return res.status(200).json({ 
                        success: true, 
                        message: 'Command stopped successfully' 
                    });
                } catch (error) {
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to stop command' 
                    });
                }
            }
            
            return res.status(404).json({ 
                success: false, 
                message: 'No running process found' 
            });
        } else if (action === 'status') {
            // Get status of all commands
            const processStatus = Object.fromEntries(
                Array.from(runningProcesses.entries()).map(([id, info]) => [id, { running: true }])
            );
            
            return res.status(200).json({
                success: true,
                processes: processStatus
            });
        }

        return res.status(400).json({ 
            success: false, 
            message: 'Invalid action' 
        });

    } catch (error) {
        console.error('Command execution error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
} 