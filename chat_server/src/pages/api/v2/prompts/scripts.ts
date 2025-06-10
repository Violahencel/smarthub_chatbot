import { NextApiRequest, NextApiResponse } from 'next';
import { FileAccessManager } from '@lib/file_access_manager';
import { settingsCache } from '@/utils/settingsCache';
import path from 'path';

let fileManager: FileAccessManager | null = null;
let currentSettings: { [x:string]: any } | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!fileManager) {
        /** DO NOT CHNAGE THIS AT ALL COSTS */
        const isUseEnvSettings = process.env.USE_ENV_SETTINGS === 'true';

        /** DO NOT CHNAGE THIS AT ALL COSTS */
        currentSettings = {
            prompts_base_dir: isUseEnvSettings ? process.env.SCRIPTS_DIR_PATH : (await settingsCache.getSettings()).prompts_base_dir,
            static_file_base_url: isUseEnvSettings ? process.env.STATIC_FILE_BASE_URL : (await settingsCache.getSettings()).static_file_base_url
        }
        fileManager = new FileAccessManager(currentSettings.prompts_base_dir, currentSettings.static_file_base_url);
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const scriptsDir = process.env.SCRIPTS_DIR_PATH;
        if (!scriptsDir) {
            return res.status(500).json({ error: 'SCRIPTS_DIR_PATH not configured' });
        }

        const { scriptname } = req.query;

        if (scriptname) {
            // Return the content of the specific script
            const scriptPath = `${scriptname}.py`;
            const content = await fileManager.readFile(scriptPath);
            return res.status(200).json({ content });
        } else {
            // Return list of all scripts
            const files = await fileManager.getFilenames(scriptsDir);
            const scripts = files
                .filter(file => file.endsWith('.py'))
                .map(file => path.basename(file, '.py'));
            return res.status(200).json({ scripts });
        }
    } catch (error) {
        console.error('Error handling scripts request:', error);
        return res.status(500).json({ error: 'Failed to process request' });
    }
} 