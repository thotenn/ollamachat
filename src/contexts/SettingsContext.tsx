import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, Provider, Assistant } from '../types';
import providerService from '../services/providerService';
import databaseService from '../services/databaseService';
import { STORAGE_KEYS, MODELS, PROVIDERS, DEFAULTS } from '@env';

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

const SETTINGS_KEY = STORAGE_KEYS.SETTINGS;

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({
    selectedProviderId: PROVIDERS.IDS.OLLAMA,
    selectedModel: MODELS.OLLAMA.DEFAULT,
    selectedAssistantId: DEFAULTS.ASSISTANT.ID,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const initializeApp = async () => {
    try {
      // Initialize database first
      await databaseService.initDatabase();
      
      // Load providers and assistants (this will trigger loadSettings via useEffect)
      await refreshProviders();
      await refreshAssistants();
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  const checkConnection = async () => {
    if (!currentProvider) {
      console.log('No current provider, setting disconnected');
      setIsConnected(false);
      return;
    }
    
    try {
      const connected = await providerService.checkConnection(currentProvider.id);
      setIsConnected(connected);
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (currentProvider) {
      providerService.setProvider(currentProvider);
      checkConnection();
    }
  }, [currentProvider]);

  // Load settings when providers and assistants are loaded
  useEffect(() => {
    if (providers.length > 0 && assistants.length > 0 && !settingsLoaded) {
      console.log('Providers and assistants loaded, loading settings...');
      console.log('Providers:', providers.map(p => `${p.id}: ${p.name}`));
      console.log('Assistants:', assistants.map(a => `${a.id}: ${a.name}`));
      loadSettings();
    }
  }, [providers, assistants, settingsLoaded]);

  const loadSettings = async () => {
    try {
      // First try to load from database
      let loadedSettings: AppSettings | null = null;
      
      try {
        loadedSettings = await databaseService.getSettings();
        console.log('Settings loaded from database:', loadedSettings);
      } catch (dbError) {
        console.warn('Failed to load settings from database:', dbError);
      }
      
      // If no settings in database, try AsyncStorage as fallback
      if (!loadedSettings) {
        const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
        if (storedSettings) {
          loadedSettings = JSON.parse(storedSettings);
          console.log('Settings loaded from AsyncStorage:', loadedSettings);
          
          // Save to database for future use
          if (loadedSettings) {
            try {
              await databaseService.saveSettings(loadedSettings);
              console.log('Settings migrated to database');
            } catch (error) {
              console.warn('Failed to migrate settings to database:', error);
            }
          }
        }
      }
      
      if (loadedSettings) {
        setSettings(loadedSettings);
        
        // Set current provider and assistant
        const provider = providers.find(p => p.id === loadedSettings.selectedProviderId);
        const assistant = assistants.find(a => a.id === loadedSettings.selectedAssistantId);
        
        if (provider) {
          console.log(`Setting current provider from loaded settings: ${provider.name}`);
          setCurrentProvider(provider);
          providerService.setProvider(provider);
        } else {
          console.warn(`Provider not found in loaded settings: ${loadedSettings.selectedProviderId}`);
        }
        if (assistant) {
          setCurrentAssistant(assistant);
        }
      } else {
        // Use defaults if no settings found anywhere
        const defaultProvider = providers.find(p => p.isDefault);
        const defaultAssistant = assistants.find(a => a.isDefault);
        
        if (defaultProvider && defaultAssistant) {
          const defaultSettings = {
            selectedProviderId: defaultProvider.id,
            selectedModel: MODELS.OLLAMA.DEFAULT,
            selectedAssistantId: defaultAssistant.id,
          };
          console.log('Using default settings:', defaultSettings);
          await updateSettings(defaultSettings);
        }
      }
      
      // Mark settings as loaded
      setSettingsLoaded(true);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettingsLoaded(true); // Mark as loaded even on error to prevent infinite loops
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      // First update the state to prevent race conditions
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      
      // Save to both AsyncStorage and Database in parallel
      const savePromises = [
        AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated)).catch(error => {
          console.warn('Failed to save settings to AsyncStorage:', error);
        }),
        databaseService.saveSettings(updated).catch(error => {
          console.warn('Failed to save settings to database:', error);
        })
      ];
      
      await Promise.all(savePromises);
      
      // Update current provider and assistant if changed
      if (newSettings.selectedProviderId !== undefined) {
        console.log(`Provider changed to: ${newSettings.selectedProviderId}`);
        
        const provider = providers.find(p => p.id === newSettings.selectedProviderId);
        if (provider) {
          console.log(`Setting current provider: ${provider.name}`);
          setCurrentProvider(provider);
          // Also update provider service immediately
          providerService.setProvider(provider);
        } else {
          console.warn(`Provider not found: ${newSettings.selectedProviderId}`);
        }
      }
      
      if (newSettings.selectedAssistantId !== undefined) {
        const assistant = assistants.find(a => a.id === newSettings.selectedAssistantId);
        if (assistant) {
          setCurrentAssistant(assistant);
        }
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
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
          }
  };

  const refreshAssistants = async () => {
    try {
      const assistantList = await databaseService.getAssistants();
      setAssistants(assistantList);
    } catch (error) {
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
          }
  };

  const createAssistant = async (assistant: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await databaseService.createAssistant(assistant);
      await refreshAssistants();
    } catch (error) {
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