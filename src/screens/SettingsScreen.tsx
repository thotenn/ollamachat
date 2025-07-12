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
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import providerService, { AIModel } from '../services/providerService';
import { Provider, Assistant } from '../types';
import CorsWarning from '../components/CorsWarning';

const SettingsScreen: React.FC = () => {
  const {
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
  } = useSettings();

  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState(settings.selectedModel);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingProvider, setIsChangingProvider] = useState(false);
  
  // Provider editing state
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [providerModalVisible, setProviderModalVisible] = useState(false);
  
  // Assistant editing state
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [assistantModalVisible, setAssistantModalVisible] = useState(false);
  const [newAssistant, setNewAssistant] = useState({
    name: '',
    description: '',
    instructions: '',
    isDefault: false,
  });

  useEffect(() => {
    if (isConnected && currentProvider) {
      loadModels();
    }
  }, [isConnected, currentProvider]);

  // Sincronizar selectedModel con settings globales
  useEffect(() => {
    setSelectedModel(settings.selectedModel);
  }, [settings.selectedModel]);

  // Limpiar modelos cuando cambie el proveedor seleccionado
  useEffect(() => {
    console.log(`Provider ID changed to: ${settings.selectedProviderId}`);
    console.log(`Current provider:`, currentProvider?.name || 'none');
    
    // Si el proveedor cambió, limpiar modelos inmediatamente
    if (currentProvider && settings.selectedProviderId !== currentProvider.id) {
      console.log('Provider mismatch detected, clearing models');
      setModels([]);
      setSelectedModel('');
    }
  }, [settings.selectedProviderId]);

  const loadModels = async () => {
    if (!currentProvider) {
      console.log('No current provider, skipping model loading');
      return;
    }
    
    // Check if we're already loading models for this provider
    if (currentProvider.id !== settings.selectedProviderId) {
      console.log(`Provider mismatch during loadModels, skipping. Current: ${currentProvider.id}, Settings: ${settings.selectedProviderId}`);
      return;
    }
    
    console.log(`Loading models for provider: ${currentProvider.name} (${currentProvider.id})`);
    setIsLoading(true);
    
    try {
      const availableModels = await providerService.getModels(currentProvider.id);
      
      // Double-check provider hasn't changed during async operation
      if (currentProvider.id !== settings.selectedProviderId) {
        console.log('Provider changed during model loading, aborting');
        return;
      }
      
      console.log(`Loaded ${availableModels.length} models for ${currentProvider.name}`);
      setModels(availableModels);
      
      if (availableModels.length > 0) {
        // Auto-seleccionar el primer modelo si no hay uno válido seleccionado
        if (!availableModels.find(m => m.name === selectedModel)) {
          const firstModel = availableModels[0].name;
          console.log(`Auto-selecting first model: ${firstModel}`);
          setSelectedModel(firstModel);
          // Only update settings with model, not triggering provider changes
          await updateSettings({ selectedModel: firstModel });
        } else {
          console.log(`Current model "${selectedModel}" is valid for this provider`);
        }
      } else {
        console.log(`No models available for ${currentProvider.name}, clearing selection`);
        setSelectedModel('');
        // Only update model, not provider
        await updateSettings({ selectedModel: '' });
      }
    } catch (error) {
      console.error(`Error loading models for ${currentProvider.name}:`, error);
      setModels([]);
      setSelectedModel('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        selectedModel,
      });
      Alert.alert('Éxito', 'Configuración guardada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderChange = async (providerId: string) => {
    try {
      console.log(`Changing provider to: ${providerId}`);
      
      // Prevent multiple rapid clicks
      if (settings.selectedProviderId === providerId || isChangingProvider) {
        console.log('Provider already selected or change in progress, ignoring');
        return;
      }
      
      setIsChangingProvider(true);
      
      // Clear models immediately
      setModels([]);
      setSelectedModel('');
      
      // Update both provider and model in a single call to prevent race conditions
      await updateSettings({ 
        selectedProviderId: providerId,
        selectedModel: ''
      });
      
      console.log(`Provider changed successfully to: ${providerId}`);
      
      // Small delay to ensure state propagation
      setTimeout(() => {
        setIsChangingProvider(false);
      }, 500);
    } catch (error) {
      console.error('Error changing provider:', error);
      setIsChangingProvider(false);
    }
  };

  const handleAssistantChange = async (assistantId: string) => {
    try {
      await updateSettings({ selectedAssistantId: assistantId });
    } catch (error) {
      console.error('Error changing assistant:', error);
    }
  };

  const openProviderEdit = (provider: Provider) => {
    setEditingProvider({ ...provider });
    setProviderModalVisible(true);
  };

  const handleProviderSave = async () => {
    if (!editingProvider) return;
    
    try {
      await updateProvider(editingProvider.id, {
        name: editingProvider.name,
        baseUrl: editingProvider.baseUrl,
        apiKey: editingProvider.apiKey,
      });
      setProviderModalVisible(false);
      Alert.alert('Éxito', 'Proveedor actualizado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el proveedor');
    }
  };

  const openAssistantEdit = (assistant?: Assistant) => {
    if (assistant) {
      setEditingAssistant({ ...assistant });
      setNewAssistant({
        name: assistant.name,
        description: assistant.description,
        instructions: assistant.instructions,
        isDefault: assistant.isDefault,
      });
    } else {
      setEditingAssistant(null);
      setNewAssistant({
        name: '',
        description: '',
        instructions: 'Eres un asistente útil y amigable. Responde de manera clara y concisa a las preguntas del usuario.',
        isDefault: false,
      });
    }
    setAssistantModalVisible(true);
  };

  const handleAssistantSave = async () => {
    try {
      if (editingAssistant) {
        // Update existing assistant
        await updateAssistant(editingAssistant.id, newAssistant);
        Alert.alert('Éxito', 'Asistente actualizado correctamente');
      } else {
        // Create new assistant
        await createAssistant(newAssistant);
        Alert.alert('Éxito', 'Asistente creado correctamente');
      }
      setAssistantModalVisible(false);
    } catch (error) {
      Alert.alert('Error', editingAssistant ? 'No se pudo actualizar el asistente' : 'No se pudo crear el asistente');
    }
  };

  const handleAssistantDelete = async (assistantId: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este asistente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAssistant(assistantId);
              Alert.alert('Éxito', 'Asistente eliminado correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el asistente');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Configuración</Text>
        </View>

        <CorsWarning />

        {/* Providers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proveedores de IA</Text>
          <Text style={styles.sectionSubtitle}>Selecciona y configura tu proveedor de IA</Text>
          
          {providers.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerItem,
                settings.selectedProviderId === provider.id && styles.providerItemSelected,
              ]}
              onPress={() => handleProviderChange(provider.id)}
              disabled={isChangingProvider}
            >
              <View style={styles.providerMain}>
                <Text
                  style={[
                    styles.providerName,
                    settings.selectedProviderId === provider.id && styles.providerNameSelected,
                  ]}
                >
                  {provider.name}
                </Text>
                <Text style={styles.providerType}>{provider.type.toUpperCase()}</Text>
                {settings.selectedProviderId === provider.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                )}
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openProviderEdit(provider)}
              >
                <Ionicons name="settings-outline" size={18} color="#666" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Text>
          </View>
        </View>

        {/* Models Section */}
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
                  onPress={async () => {
                    setSelectedModel(model.name);
                    await updateSettings({ selectedModel: model.name });
                  }}
                >
                  <Text
                    style={[
                      styles.modelName,
                      selectedModel === model.name && styles.modelNameSelected,
                    ]}
                  >
                    {model.displayName || model.name}
                  </Text>
                  {selectedModel === model.name && (
                    <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noModelsText}>
              {isConnected ? 'No hay modelos disponibles' : 'Conecta con el proveedor para ver los modelos'}
            </Text>
          )}
        </View>

        {/* Assistants Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Asistentes</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openAssistantEdit()}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>Selecciona o crea asistentes personalizados</Text>
          
          {assistants.map((assistant) => (
            <TouchableOpacity
              key={assistant.id}
              style={[
                styles.assistantItem,
                settings.selectedAssistantId === assistant.id && styles.assistantItemSelected,
              ]}
              onPress={() => handleAssistantChange(assistant.id)}
            >
              <View style={styles.assistantMain}>
                <Text
                  style={[
                    styles.assistantName,
                    settings.selectedAssistantId === assistant.id && styles.assistantNameSelected,
                  ]}
                >
                  {assistant.name}
                </Text>
                <Text style={styles.assistantDescription}>{assistant.description}</Text>
                {settings.selectedAssistantId === assistant.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                )}
              </View>
              <View style={styles.assistantActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openAssistantEdit(assistant)}
                >
                  <Ionicons name="create-outline" size={18} color="#666" />
                </TouchableOpacity>
                {!assistant.isDefault && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleAssistantDelete(assistant.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#F44336" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
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
      </ScrollView>

      {/* Provider Edit Modal */}
      <Modal
        visible={providerModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setProviderModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Configurar Proveedor</Text>
            <TouchableOpacity onPress={handleProviderSave}>
              <Text style={styles.modalSave}>Guardar</Text>
            </TouchableOpacity>
          </View>
          
          {editingProvider && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nombre</Text>
                <TextInput
                  style={styles.formInput}
                  value={editingProvider.name}
                  onChangeText={(text) => setEditingProvider({ ...editingProvider, name: text })}
                  placeholder="Nombre del proveedor"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>URL Base</Text>
                <TextInput
                  style={styles.formInput}
                  value={editingProvider.baseUrl}
                  onChangeText={(text) => setEditingProvider({ ...editingProvider, baseUrl: text })}
                  placeholder="https://api.example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>API Key (opcional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={editingProvider.apiKey || ''}
                  onChangeText={(text) => setEditingProvider({ ...editingProvider, apiKey: text })}
                  placeholder="Tu API Key"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Assistant Edit Modal */}
      <Modal
        visible={assistantModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAssistantModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingAssistant ? 'Editar Asistente' : 'Nuevo Asistente'}
            </Text>
            <TouchableOpacity onPress={handleAssistantSave}>
              <Text style={styles.modalSave}>Guardar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nombre</Text>
              <TextInput
                style={styles.formInput}
                value={newAssistant.name}
                onChangeText={(text) => setNewAssistant({ ...newAssistant, name: text })}
                placeholder="Nombre del asistente"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Descripción</Text>
              <TextInput
                style={styles.formInput}
                value={newAssistant.description}
                onChangeText={(text) => setNewAssistant({ ...newAssistant, description: text })}
                placeholder="Breve descripción del asistente"
                multiline
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Instrucciones</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={newAssistant.instructions}
                onChangeText={(text) => setNewAssistant({ ...newAssistant, instructions: text })}
                placeholder="Instrucciones detalladas para el asistente..."
                multiline
                numberOfLines={6}
              />
            </View>
            
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Asistente por defecto</Text>
                <Switch
                  value={newAssistant.isDefault}
                  onValueChange={(value) => setNewAssistant({ ...newAssistant, isDefault: value })}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  addButton: {
    padding: 4,
  },
  providerItem: {
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
  providerItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  providerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  providerNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  providerType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  editButton: {
    padding: 8,
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
  assistantItem: {
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
  assistantItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  assistantMain: {
    flex: 1,
  },
  assistantName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  assistantNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  assistantDescription: {
    fontSize: 12,
    color: '#666',
  },
  assistantActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  formTextArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default SettingsScreen;