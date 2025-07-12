import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import ollamaService from '../services/ollamaService';
import { OllamaModel } from '../types';

const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, isConnected, checkConnection } = useSettings();
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollamaUrl);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState(settings.selectedModel);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isConnected) {
      loadModels();
    }
  }, [isConnected]);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const availableModels = await ollamaService.getModels();
      setModels(availableModels);
      
      if (availableModels.length > 0 && !availableModels.find(m => m.name === selectedModel)) {
        setSelectedModel(availableModels[0].name);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        ollamaUrl: ollamaUrl.trim(),
        selectedModel,
      });
      Alert.alert('Éxito', 'Configuración guardada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    ollamaService.setBaseUrl(ollamaUrl);
    await checkConnection();
    const connected = await ollamaService.checkConnection();
    
    if (connected) {
      Alert.alert('Éxito', 'Conexión establecida correctamente');
      loadModels();
    } else {
      Alert.alert('Error', 'No se pudo conectar con el servidor Ollama');
    }
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Configuración</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servidor Ollama</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={ollamaUrl}
              onChangeText={setOllamaUrl}
              placeholder="http://localhost:11434"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestConnection}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.testButtonText}>Probar</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modelo</Text>
          {isLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : models.length > 0 ? (
            <View style={styles.modelsContainer}>
              {models.map((model) => (
                <TouchableOpacity
                  key={model.name}
                  style={[
                    styles.modelItem,
                    selectedModel === model.name && styles.modelItemSelected,
                  ]}
                  onPress={() => setSelectedModel(model.name)}
                >
                  <Text
                    style={[
                      styles.modelName,
                      selectedModel === model.name && styles.modelNameSelected,
                    ]}
                  >
                    {model.name}
                  </Text>
                  {selectedModel === model.name && (
                    <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noModelsText}>
              {isConnected ? 'No hay modelos disponibles' : 'Conecta con el servidor para ver los modelos'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (!isConnected || isSaving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isConnected || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Configuración</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Información</Text>
          <Text style={styles.infoText}>
            Para usar esta aplicación, necesitas tener Ollama ejecutándose en tu servidor.
          </Text>
          <Text style={styles.infoText}>
            Asegúrate de que Ollama esté configurado para aceptar conexiones desde tu dispositivo.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  testButton: {
    marginLeft: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  modelsContainer: {
    marginTop: 8,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  modelItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  modelName: {
    fontSize: 16,
    color: '#333',
  },
  modelNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  noModelsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 20,
  },
  loader: {
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 32,
    paddingHorizontal: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default SettingsScreen;