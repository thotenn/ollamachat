import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, Provider, Assistant } from '../types';
import providerService from '../services/providerService';
import databaseService from '../services/databaseService';

interface SettingsContextData {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  isConnected: boolean;
  checkConnection: () => Promise<void>;
  providers: Provider[];
  assistants: Assistant[];
  currentProvider: Provider | null;
  currentAssistant: Assistant | null;
  refreshProviders: () => Promise<void>;
  refreshAssistants: () => Promise<void>;
  updateProvider: (providerId: string, updates: Partial<Provider>) => Promise<void>;
  createAssistant: (assistant: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAssistant: (assistantId: string, updates: Partial<Assistant>) => Promise<void>;
  deleteAssistant: (assistantId: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextData>({} as SettingsContextData);

const SETTINGS_KEY = '@ollamachat:settings';

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({
    selectedProviderId: 'ollama-default',
    selectedModel: 'llama2',
    selectedAssistantId: 'default-assistant',
  });
  const [isConnected, setIsConnected] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (currentProvider) {
      providerService.setProvider(currentProvider);
      checkConnection();
    }
  }, [currentProvider]);

  const initializeApp = async () => {
    try {
      // Initialize database first
      await databaseService.initDatabase();
      
      // Load providers and assistants
      await refreshProviders();
      await refreshAssistants();
      
      // Load settings
      await loadSettings();
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSettings(parsed);
        
        // Set current provider and assistant
        const provider = providers.find(p => p.id === parsed.selectedProviderId);
        const assistant = assistants.find(a => a.id === parsed.selectedAssistantId);
        
        if (provider) {
          setCurrentProvider(provider);
        }
        if (assistant) {
          setCurrentAssistant(assistant);
        }
      } else {
        // Use defaults if no settings found
        const defaultProvider = providers.find(p => p.isDefault);
        const defaultAssistant = assistants.find(a => a.isDefault);
        
        if (defaultProvider && defaultAssistant) {
          const defaultSettings = {
            selectedProviderId: defaultProvider.id,
            selectedModel: 'llama2',
            selectedAssistantId: defaultAssistant.id,
          };
          await updateSettings(defaultSettings);
        }
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
      
      // Update current provider and assistant if changed
      if (newSettings.selectedProviderId) {
        const provider = providers.find(p => p.id === newSettings.selectedProviderId);
        if (provider) {
          setCurrentProvider(provider);
        }
      }
      
      if (newSettings.selectedAssistantId) {
        const assistant = assistants.find(a => a.id === newSettings.selectedAssistantId);
        if (assistant) {
          setCurrentAssistant(assistant);
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const checkConnection = async () => {
    if (!currentProvider) {
      setIsConnected(false);
      return;
    }
    
    const connected = await providerService.checkConnection(currentProvider.id);
    setIsConnected(connected);
  };

  const refreshProviders = async () => {
    try {
      const providerList = await databaseService.getProviders();
      setProviders(providerList);
      
      // Set up provider services
      providerList.forEach(provider => {
        providerService.setProvider(provider);
      });
    } catch (error) {
      console.error('Error refreshing providers:', error);
    }
  };

  const refreshAssistants = async () => {
    try {
      const assistantList = await databaseService.getAssistants();
      setAssistants(assistantList);
    } catch (error) {
      console.error('Error refreshing assistants:', error);
    }
  };

  const updateProvider = async (providerId: string, updates: Partial<Provider>) => {
    try {
      await databaseService.updateProvider(providerId, updates);
      await refreshProviders();
      
      // Update current provider if it's the one being updated
      if (currentProvider?.id === providerId) {
        const updatedProvider = providers.find(p => p.id === providerId);
        if (updatedProvider) {
          setCurrentProvider(updatedProvider);
        }
      }
    } catch (error) {
      console.error('Error updating provider:', error);
    }
  };

  const createAssistant = async (assistant: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await databaseService.createAssistant(assistant);
      await refreshAssistants();
    } catch (error) {
      console.error('Error creating assistant:', error);
    }
  };

  const updateAssistant = async (assistantId: string, updates: Partial<Assistant>) => {
    try {
      await databaseService.updateAssistant(assistantId, updates);
      await refreshAssistants();
      
      // Update current assistant if it's the one being updated
      if (currentAssistant?.id === assistantId) {
        const updatedAssistant = assistants.find(a => a.id === assistantId);
        if (updatedAssistant) {
          setCurrentAssistant(updatedAssistant);
        }
      }
    } catch (error) {
      console.error('Error updating assistant:', error);
    }
  };

  const deleteAssistant = async (assistantId: string) => {
    try {
      await databaseService.deleteAssistant(assistantId);
      await refreshAssistants();
      
      // If deleting current assistant, switch to default
      if (currentAssistant?.id === assistantId) {
        const defaultAssistant = assistants.find(a => a.isDefault && a.id !== assistantId);
        if (defaultAssistant) {
          await updateSettings({ selectedAssistantId: defaultAssistant.id });
        }
      }
    } catch (error) {
      console.error('Error deleting assistant:', error);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        isConnected,
        checkConnection,
        providers,
        assistants,
        currentProvider,
        currentAssistant,
        refreshProviders,
        refreshAssistants,
        updateProvider,
        createAssistant,
        updateAssistant,
        deleteAssistant,
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