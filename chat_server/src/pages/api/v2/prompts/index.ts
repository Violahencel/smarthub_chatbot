import { NextApiRequest, NextApiResponse } from 'next';
import { FileAccessManager } from '@lib/file_access_manager';
import path from 'path';
import fs from 'fs';
import { settingsCache } from '@/utils/settingsCache';

let fileManager: FileAccessManager | null = null;
let currentSettings: { [x:string]: any } | null = null;

interface PromptFile {
    name: string;
    path: string;
}

interface Folder {
    folder: string;
    prompts: PromptFile[];
}

// Ensure the base directory exists
// if (!fs.existsSync(BASE_DIR)) {
//     fs.mkdirSync(BASE_DIR, { recursive: true });
// }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    try {
        // Initialize file manager with cached settings
        /**
         * 
         * Do not remove any of the code below it is working and kept as is, i am going with ENV variables for now.
         */
        // if (!fileManager || !currentSettings) {
        //     currentSettings = await settingsCache.getSettings();
        //     fileManager = new FileAccessManager(currentSettings.prompts_base_dir, currentSettings.static_file_base_url);
        // }

        // if (!fileManager || !currentSettings) {
        //     return res.status(500).json({ error: 'Failed to initialize file manager' });
        // }

        const isUseEnvSettings = process.env.USE_ENV_SETTINGS === 'true';

        // Fix for the case where PROMPTS_DIR_PATH might have an extra equals sign
        let promptsDirPath = process.env.PROMPTS_DIR_PATH;
        if (promptsDirPath && promptsDirPath.startsWith('=')) {
            promptsDirPath = promptsDirPath.substring(1);
        }

        console.log('PROMPTS_DIR_PATH from env:', process.env.PROMPTS_DIR_PATH);
        console.log('Fixed promptsDirPath:', promptsDirPath);

        currentSettings = {
            prompts_base_dir: promptsDirPath || 'D:\\ThoughtfocusRD\\zenovo_demo2\\prompts',
            static_file_base_url: process.env.STATIC_FILE_BASE_URL || (await settingsCache.getSettings()).static_file_base_url
        }

        console.log('Using prompts_base_dir:', currentSettings.prompts_base_dir);

        fileManager = new FileAccessManager(currentSettings.prompts_base_dir);

        // After this point, we know these are non-null
        const settings = currentSettings!;
        const manager = fileManager!;

        switch (method) {
            case 'GET':
                if (req.query.folder && req.query.filename) {
                    // Get specific file content
                    const filePath = path.join(settings.prompts_base_dir, req.query.folder as string, req.query.filename as string);
                    if (!manager.fileExists(filePath)) {
                        return res.status(404).json({ error: 'File not found' });
                    }
                    const content = manager.readFile(filePath);
                    return res.status(200).json({ content });
                } else if (req.query.folder) {
                    // Get all prompts in a folder
                    const folderPath = path.join(settings.prompts_base_dir, req.query.folder as string);
                    
                    // Ensure folder exists
                    if (!fs.existsSync(folderPath)) {
                        fs.mkdirSync(folderPath, { recursive: true });
                    }

                    // Get all YML files in the folder
                    const files = manager.getFilenames(folderPath) || [];
                    const promptFiles = files.filter(file => file.endsWith('.yml') || file.endsWith('.yaml') || file.endsWith('.json'));
                    
                    const prompts = promptFiles.map(file => ({
                        name: file,
                        path: file
                    }));

                    return res.status(200).json({ 
                        folder: req.query.folder as string,
                        prompts
                    });
                } else {
                    // List all folders and their contents
                    const folders = await manager.listFolders();
                    console.log('Found folders:', folders);
                    const result: Folder[] = [];

                    for (const folder of folders) {
                        const folderPath = path.join(settings.prompts_base_dir, folder);
                        console.log('Processing folder:', folder, 'at path:', folderPath);
                        const files = manager.getFilenames(folderPath) || [];
                        console.log('Found files in folder:', folder, ':', files);
                        const promptFiles = files.filter(file => file.endsWith('.yml') || file.endsWith('.yaml') || file.endsWith('.json'));
                        console.log('Found prompt files in folder:', folder, ':', promptFiles);
                        
                        const prompts = promptFiles.map(file => ({
                            name: file,
                            path: `${folder}/${file}`
                        }));

                        result.push({
                            folder,
                            prompts
                        });
                    }

                    return res.status(200).json({ folders: result });
                }

            case 'POST':
                try {
                    const { folder, filename, content } = req.body;
                    const fileAccessManager = new FileAccessManager(settings.prompts_base_dir);

                    // Handle file content update
                    if (!folder || !filename) {
                        return res.status(400).json({ error: 'Folder and filename are required' });
                    }

                    const filePath = `${settings.prompts_base_dir}/${folder}/${filename}`;
                    await fileAccessManager.writeFile(filePath, content);
                    res.status(200).json({ success: true });
                } catch (error) {
                    console.error('Error in prompts API:', error);
                    res.status(500).json({ error: 'Internal server error' });
                }

            case 'DELETE':
                // Handle file deletion
                if (!req.query.folder || !req.query.filename) {
                    return res.status(400).json({ error: 'Folder and filename are required' });
                }
                const deletePath = path.join(settings.prompts_base_dir, req.query.folder as string, req.query.filename as string);
                if (!manager.fileExists(deletePath)) {
                    return res.status(404).json({ error: 'File not found' });
                }
                fs.unlinkSync(deletePath);
                return res.status(200).json({ message: 'File deleted successfully' });

            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
} 