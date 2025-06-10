import { NextApiRequest, NextApiResponse } from 'next';
import { FileAccessManager } from '@/lib/file_access_manager';
import { settingsCache } from '@/utils/settingsCache';

interface Config {
    actions: {
        [key: string]: {
            activeSystemPrompt: string;
            activeInstructionPrompt: string;
            output_formatting?: string;
            requires_browser?: boolean;
            disable_browser_config?: boolean;
            prompt_scripts?: string[];
        };
    };
}

let fileManager: FileAccessManager | null = null;
let currentSettings: { [x:string]: any } | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Initialize file manager if not already initialized
    if (!fileManager) {
        /** DO NOT CHNAGE THIS AT ALL COSTS */
        const isUseEnvSettings = process.env.USE_ENV_SETTINGS === 'true';

        /** DO NOT CHNAGE THIS AT ALL COSTS */
        currentSettings = {
            prompts_base_dir: isUseEnvSettings ? process.env.PROMPTS_DIR_PATH : (await settingsCache.getSettings()).prompts_base_dir,
            static_file_base_url: isUseEnvSettings ? process.env.STATIC_FILE_BASE_URL : (await settingsCache.getSettings()).static_file_base_url
        }
        fileManager = new FileAccessManager(currentSettings.prompts_base_dir, currentSettings.static_file_base_url);
    }

    try {
        if (req.method === 'GET') {
            const { folder, action } = req.query;

            if (!folder || !action) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            // Read the config file
            const configPath = `${folder}/config.json`;
            let config: Config = {
                actions: {}
            };

            try {
                const configContent = await fileManager.readFile(configPath);
                config = JSON.parse(configContent) as Config;
            } catch (error) {
                // If config doesn't exist, return empty active prompts
                return res.status(200).json({
                    activeSystemPrompt: '',
                    activeInstructionPrompt: ''
                });
            }

            // Get active prompts for the action
            const actionConfig = config.actions[action as string] || {
                activeSystemPrompt: '',
                activeInstructionPrompt: ''
            };

            return res.status(200).json(actionConfig);
        }

        if (req.method === 'POST') {
            const { folder, action, updates } = req.body;

            if (!folder || !action || !updates) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            // Read the current config
            const configPath = `${folder}/config.json`;
            let config: Config = {
                actions: {}
            };
            try {
                const configContent = await fileManager.readFile(configPath);
                config = JSON.parse(configContent) as Config;
            } catch (error) {
                // If config doesn't exist, use default config
            }

            // Initialize action config if it doesn't exist
            if (!config.actions[action]) {
                config.actions[action] = {
                    activeSystemPrompt: '',
                    activeInstructionPrompt: ''
                };
            }

            // Update only the provided fields
            if (updates.activeSystemPrompt !== undefined) {
                config.actions[action].activeSystemPrompt = updates.activeSystemPrompt;
            }
            if (updates.activeInstructionPrompt !== undefined) {
                config.actions[action].activeInstructionPrompt = updates.activeInstructionPrompt;
            }
            if (updates.requires_browser !== undefined) {
                config.actions[action].requires_browser = updates.requires_browser;
            }

            // delete updates.activeSystemPrompt;
            // delete updates.activeInstructionPrompt;

            // if (Object.keys(updates).length > 0) {
            //     config.actions[action] = { 
            //         ...config.actions[action], 
            //         ...updates 
            //     };
            // }

            // Write the updated config
            await fileManager.writeFileRelative(configPath, JSON.stringify(config, null, 2));

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Error in active prompts API:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 