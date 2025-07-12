import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';
import ollamaService from '../services/ollamaService';

interface SettingsContextData {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  isConnected: boolean;
  checkConnection: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextData>({} as SettingsContextData);

const SETTINGS_KEY = '@ollamachat:settings';

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({
    ollamaUrl: 'http://localhost:11434',
    selectedModel: 'llama2',
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    ollamaService.setBaseUrl(settings.ollamaUrl);
    checkConnection();
  }, [settings.ollamaUrl]);

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSettings(parsed);
        ollamaService.setBaseUrl(parsed.ollamaUrl);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      setSettings(updated);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const checkConnection = async () => {
    const connected = await ollamaService.checkConnection();
    setIsConnected(connected);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        isConnected,
        checkConnection,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};