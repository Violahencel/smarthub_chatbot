import { SettingsModel } from '@/types/settings';

export const sampleSettings: SettingsModel[] = [
  // General Settings
  {
    key: 'app_name',
    value: 'Chat Admin',
    type: 'text',
    description: 'The name of your application',
    category: 'general',
    isActive: true,
    placeholder: 'Enter application name',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'theme_color',
    value: '#FF9900',
    type: 'color',
    description: 'Primary theme color of the application',
    category: 'general',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'timezone',
    value: 'UTC',
    type: 'select',
    description: 'Default timezone for the application',
    category: 'general',
    isActive: true,
    options: [
      { label: 'UTC', value: 'UTC' },
      { label: 'EST', value: 'EST' },
      { label: 'PST', value: 'PST' },
      { label: 'IST', value: 'IST' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Security Settings
  {
    key: 'session_timeout',
    value: 30,
    type: 'number',
    description: 'Session timeout in minutes',
    category: 'security',
    isActive: true,
    min: 5,
    max: 120,
    step: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'password_policy',
    value: {
      minLength: 8,
      requireNumbers: true,
      requireSpecialChars: true,
      requireUppercase: true
    },
    type: 'json',
    description: 'Password policy configuration',
    category: 'security',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'two_factor_auth',
    value: false,
    type: 'boolean',
    description: 'Enable two-factor authentication',
    category: 'security',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // API Settings
  {
    key: 'api_rate_limit',
    value: 100,
    type: 'number',
    description: 'Maximum API requests per minute',
    category: 'api',
    isActive: true,
    min: 10,
    max: 1000,
    step: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'api_key',
    value: '',
    type: 'password',
    description: 'API key for external services',
    category: 'api',
    isActive: true,
    placeholder: 'Enter your API key',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'api_endpoints',
    value: [
      { name: 'users', enabled: true },
      { name: 'messages', enabled: true },
      { name: 'files', enabled: true }
    ],
    type: 'json',
    description: 'API endpoints configuration',
    category: 'api',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // System Settings
  {
    key: 'log_level',
    value: 'info',
    type: 'radio',
    description: 'System log level',
    category: 'system',
    isActive: true,
    options: [
      { label: 'Debug', value: 'debug' },
      { label: 'Info', value: 'info' },
      { label: 'Warning', value: 'warning' },
      { label: 'Error', value: 'error' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'maintenance_mode',
    value: false,
    type: 'boolean',
    description: 'Enable maintenance mode',
    category: 'system',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'system_message',
    value: 'Welcome to the system!',
    type: 'textarea',
    description: 'System-wide message to display to users',
    category: 'system',
    isActive: true,
    placeholder: 'Enter system message',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'backup_schedule',
    value: '2024-03-20T00:00:00Z',
    type: 'date',
    description: 'Next scheduled backup date and time',
    category: 'system',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'prompts_base_dir',
    displayText: 'Prompts Base Directory',
    value: 'data/prompts',
    type: 'text',
    description: 'Base directory for storing prompt files',
    category: 'system',
    isActive: true
  }
]; 

console.log(JSON.stringify(sampleSettings, null, 2));