import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { SettingsModel, SettingType } from '@/types/settings';
import MaintainanceMode from '@/components/Admin/MaintainanceMode';
import { is } from 'date-fns/locale';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
    setIsLocalhost(isLocalhost);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data.settings || []);
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (setting: SettingsModel, newValue: any) => {
    try {
      const updatedSetting = { ...setting, value: newValue };
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSetting),
      });
      setSettings(settings.map(s => s._id === setting._id ? updatedSetting : s));
    } catch (err) {
      setError('Failed to update setting');
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setError('Settings saved successfully');
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSettingInput = (setting: SettingsModel) => {
    const commonProps = {
      className: "w-full px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200",
      placeholder: setting.placeholder
    };

    switch (setting.type) {
      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value}
              onChange={(e) => handleSettingChange(setting, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting, Number(e.target.value))}
            min={setting.min}
            max={setting.max}
            step={setting.step}
            {...commonProps}
          />
        );

      case 'date':
        return (
          <input
            type="datetime-local"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting, e.target.value)}
            className={commonProps.className}
          />
        );

      case 'select':
        return (
          <select
            value={setting.value}
            onChange={(e) => handleSettingChange(setting, e.target.value)}
            className={commonProps.className}
          >
            {setting.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="flex flex-col space-y-2">
            {setting.options?.map(option => (
              <label key={option.value} className="inline-flex items-center">
                <input
                  type="radio"
                  name={setting.key}
                  value={option.value}
                  checked={setting.value === option.value}
                  onChange={(e) => handleSettingChange(setting, e.target.value)}
                  className="w-4 h-4 text-primary-500 border-gray-300 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'color':
        return (
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={setting.value}
              onChange={(e) => handleSettingChange(setting, e.target.value)}
              className="h-10 w-20 rounded border border-gray-200 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">{setting.value}</span>
          </div>
        );

      case 'password':
        return (
          <input
            type="password"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting, e.target.value)}
            className={commonProps.className}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={setting.value}
            onChange={(e) => handleSettingChange(setting, e.target.value)}
            rows={4}
            className={commonProps.className}
          />
        );

      case 'json':
        return (
          <textarea
            value={JSON.stringify(setting.value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleSettingChange(setting, parsed);
              } catch (err) {
                // Invalid JSON, don't update
              }
            }}
            rows={4}
            className={`${commonProps.className} font-mono`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting, e.target.value)}
            {...commonProps}
          />
        );
    }
  };

  const settingsByCategory = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SettingsModel[]>);


  return (
    !isLocalhost ? <MaintainanceMode title="Settings" /> :
    <AdminLayout>
      <div className="h-[calc(100vh-3rem)] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your application settings and preferences</p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded ${
            error.includes('success') 
              ? 'bg-green-50 border-l-4 border-green-500' 
              : 'bg-red-50 border-l-4 border-red-500'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {error.includes('success') ? (
                  <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm ${
                  error.includes('success') ? 'text-green-700' : 'text-red-700'
                }`}>
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <div className="flex h-full">
              {/* Sidebar Navigation */}
              <div className="w-64 border-r border-gray-200 bg-white">
                <nav className="p-4 space-y-1">
                  {Object.keys(settingsByCategory).map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveTab(category)}
                      className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                        activeTab === category
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="capitalize">{category}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6">
                      <h2 className="text-xl font-semibold text-gray-900 capitalize mb-6">
                        {activeTab} Settings
                      </h2>
                      <div className="space-y-6">
                        {settingsByCategory[activeTab]?.map((setting) => (
                          <div key={setting._id?.toString()} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700">
                                {setting.displayText || setting.key}
                              </label>
                              {setting.description && (
                                <span className="text-xs text-gray-500">
                                  {setting.description}
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              {renderSettingInput(setting)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 