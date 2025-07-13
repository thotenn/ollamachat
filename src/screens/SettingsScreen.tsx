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
import { COLORS } from '@env';
import { COMMON_STYLES, TYPOGRAPHY, createTextStyle } from '../styles/GlobalStyles';

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
    
    // Si el proveedor cambió, limpiar modelos inmediatamente
    if (currentProvider && settings.selectedProviderId !== currentProvider.id) {
      setModels([]);
      setSelectedModel('');
    }
  }, [settings.selectedProviderId]);

  const loadModels = async () => {
    if (!currentProvider) {
      return;
    }
    
    // Check if we're already loading models for this provider
    if (currentProvider.id !== settings.selectedProviderId) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const availableModels = await providerService.getModels(currentProvider.id);
      
      // Double-check provider hasn't changed during async operation
      if (currentProvider.id !== settings.selectedProviderId) {
        return;
      }
      
      setModels(availableModels);
      
      if (availableModels.length > 0) {
        // Auto-seleccionar el primer modelo si no hay uno válido seleccionado
        if (!availableModels.find(m => m.name === selectedModel)) {
          const firstModel = availableModels[0].name;
          setSelectedModel(firstModel);
          // Only update settings with model, not triggering provider changes
          await updateSettings({ selectedModel: firstModel });
        } else {
        }
      } else {
        setSelectedModel('');
        // Only update model, not provider
        await updateSettings({ selectedModel: '' });
      }
    } catch (error) {
      setModels([]);
      setSelectedModel('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save the complete current settings including provider, model, and assistant
      await updateSettings({
        selectedProviderId: settings.selectedProviderId,
        selectedModel,
        selectedAssistantId: settings.selectedAssistantId,
      });
      Alert.alert(
        'Configuración Guardada', 
        `Proveedor: ${currentProvider?.name || 'N/A'}\nModelo: ${selectedModel || 'N/A'}\nAsistente: ${currentAssistant?.name || 'N/A'}\n\nLa configuración se ha guardado y se restaurará al reiniciar la aplicación.`
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderChange = async (providerId: string) => {
    try {
      console.log(`Changing provider to: ${providerId}`);
      
      // Prevent multiple rapid clicks
      if (settings.selectedProviderId === providerId || isChangingProvider) {
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
      
      console.log(`Provider successfully changed to: ${providerId}`);
      
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
    <SafeAreaView style={COMMON_STYLES.screenContainer}>
      <View style={COMMON_STYLES.header}>
        <Text style={TYPOGRAPHY.HEADER_TITLE}>Configuración</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CorsWarning />

        {/* Settings Description */}
        <View style={[COMMON_STYLES.section, { paddingBottom: 8 }]}>
          <Text style={[TYPOGRAPHY.SECTION_SUBTITLE, { textAlign: 'center', fontStyle: 'italic' }]}>
            Los cambios se aplican inmediatamente. Use "Persistir Configuración" para guardar permanentemente la configuración actual.
          </Text>
        </View>

        {/* Providers Section */}
        <View style={COMMON_STYLES.section}>
          <Text style={TYPOGRAPHY.SECTION_TITLE}>Proveedores de IA</Text>
          <Text style={TYPOGRAPHY.SECTION_SUBTITLE}>Selecciona y configura tu proveedor de IA</Text>
          
          {providers.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={[
                COMMON_STYLES.selectableItem,
                settings.selectedProviderId === provider.id && COMMON_STYLES.selectableItemSelected,
              ]}
              onPress={() => handleProviderChange(provider.id)}
              disabled={isChangingProvider}
            >
              <View style={COMMON_STYLES.itemMain}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text
                    style={createTextStyle(TYPOGRAPHY.BODY_LARGE, {
                      color: settings.selectedProviderId === provider.id ? COLORS.PRIMARY : COLORS.TEXT.DARK,
                      fontWeight: settings.selectedProviderId === provider.id ? '600' : 'normal',
                      marginRight: 8,
                    })}
                  >
                    {provider.name}
                  </Text>
                  {settings.selectedProviderId === provider.id && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.PRIMARY} />
                  )}
                </View>
                {/* <Text style={styles.providerType}>{provider.type.toUpperCase()}</Text> */}
              </View>
              <TouchableOpacity
                style={COMMON_STYLES.iconButton}
                onPress={() => openProviderEdit(provider)}
              >
                <Ionicons name="settings-outline" size={18} color={COLORS.TEXT.SECONDARY} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          
          <View style={COMMON_STYLES.statusContainer}>
            <View style={[COMMON_STYLES.statusDot, { backgroundColor: isConnected ? COLORS.SUCCESS : COLORS.ERROR }]} />
            <Text style={TYPOGRAPHY.STATUS_TEXT}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Text>
          </View>
        </View>

        {/* Models Section */}
        <View style={COMMON_STYLES.section}>
          <Text style={TYPOGRAPHY.SECTION_TITLE}>Modelo</Text>
          {isLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : models.length > 0 ? (
            <View style={styles.modelsContainer}>
              {models.map((model) => (
                <TouchableOpacity
                  key={model.name}
                  style={[
                    COMMON_STYLES.selectableItem,
                    selectedModel === model.name && COMMON_STYLES.selectableItemSelected,
                  ]}
                  onPress={async () => {
                    setSelectedModel(model.name);
                    await updateSettings({ selectedModel: model.name });
                  }}
                >
                  <View style={COMMON_STYLES.itemMain}>
                    <Text
                      style={createTextStyle(TYPOGRAPHY.BODY_LARGE, {
                        color: selectedModel === model.name ? COLORS.PRIMARY : COLORS.TEXT.DARK,
                        fontWeight: selectedModel === model.name ? '600' : 'normal',
                      })}
                    >
                      {model.displayName || model.name}
                    </Text>
                  </View>
                  {selectedModel === model.name && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.PRIMARY} />
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
        <View style={COMMON_STYLES.section}>
          <View style={COMMON_STYLES.sectionHeader}>
            <Text style={TYPOGRAPHY.SECTION_TITLE}>Asistentes</Text>
            <TouchableOpacity
              style={COMMON_STYLES.addButton}
              onPress={() => openAssistantEdit()}
            >
              <Ionicons name="add" size={20} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>
          <Text style={TYPOGRAPHY.SECTION_SUBTITLE}>Selecciona o crea asistentes personalizados</Text>
          
          {assistants.map((assistant) => (
            <TouchableOpacity
              key={assistant.id}
              style={[
                COMMON_STYLES.selectableItem,
                settings.selectedAssistantId === assistant.id && COMMON_STYLES.selectableItemSelected,
              ]}
              onPress={() => handleAssistantChange(assistant.id)}
            >
              <View style={COMMON_STYLES.itemMain}>
                <Text
                  style={createTextStyle(TYPOGRAPHY.BODY_LARGE, {
                    color: settings.selectedAssistantId === assistant.id ? COLORS.PRIMARY : COLORS.TEXT.DARK,
                    fontWeight: settings.selectedAssistantId === assistant.id ? '600' : 'normal',
                    marginBottom: 2,
                  })}
                >
                  {assistant.name}
                </Text>
                <Text style={TYPOGRAPHY.BODY_SMALL}>{assistant.description}</Text>
                {settings.selectedAssistantId === assistant.id && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.PRIMARY} />
                )}
              </View>
              <View style={COMMON_STYLES.itemActions}>
                <TouchableOpacity
                  style={COMMON_STYLES.iconButton}
                  onPress={() => openAssistantEdit(assistant)}
                >
                  <Ionicons name="create-outline" size={18} color={COLORS.TEXT.SECONDARY} />
                </TouchableOpacity>
                {!assistant.isDefault && (
                  <TouchableOpacity
                    style={COMMON_STYLES.actionButton}
                    onPress={() => handleAssistantDelete(assistant.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.ERROR} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[COMMON_STYLES.primaryButton, (!isConnected || isSaving) && COMMON_STYLES.primaryButtonDisabled]}
          onPress={handleSave}
          disabled={!isConnected || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={TYPOGRAPHY.BUTTON_PRIMARY}>Persistir Configuración</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Provider Edit Modal */}
      <Modal
        visible={providerModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={COMMON_STYLES.modalContainer}>
          <View style={COMMON_STYLES.modalHeader}>
            <TouchableOpacity onPress={() => setProviderModalVisible(false)}>
              <Text style={createTextStyle(TYPOGRAPHY.MODAL_BUTTON, { color: COLORS.TEXT.SECONDARY })}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={TYPOGRAPHY.MODAL_TITLE}>Configurar Proveedor</Text>
            <TouchableOpacity onPress={handleProviderSave}>
              <Text style={createTextStyle(TYPOGRAPHY.MODAL_BUTTON, { color: COLORS.PRIMARY })}>Guardar</Text>
            </TouchableOpacity>
          </View>
          
          {editingProvider && (
            <ScrollView style={COMMON_STYLES.modalContent}>
              <View style={COMMON_STYLES.formGroup}>
                <Text style={TYPOGRAPHY.FORM_LABEL}>Nombre</Text>
                <TextInput
                  style={COMMON_STYLES.formInput}
                  value={editingProvider.name}
                  onChangeText={(text) => setEditingProvider({ ...editingProvider, name: text })}
                  placeholder="Nombre del proveedor"
                />
              </View>
              
              <View style={COMMON_STYLES.formGroup}>
                <Text style={TYPOGRAPHY.FORM_LABEL}>URL Base</Text>
                <TextInput
                  style={COMMON_STYLES.formInput}
                  value={editingProvider.baseUrl}
                  onChangeText={(text) => setEditingProvider({ ...editingProvider, baseUrl: text })}
                  placeholder="https://api.example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              
              <View style={COMMON_STYLES.formGroup}>
                <Text style={TYPOGRAPHY.FORM_LABEL}>API Key (opcional)</Text>
                <TextInput
                  style={COMMON_STYLES.formInput}
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
        <SafeAreaView style={COMMON_STYLES.modalContainer}>
          <View style={COMMON_STYLES.modalHeader}>
            <TouchableOpacity onPress={() => setAssistantModalVisible(false)}>
              <Text style={createTextStyle(TYPOGRAPHY.MODAL_BUTTON, { color: COLORS.TEXT.SECONDARY })}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={TYPOGRAPHY.MODAL_TITLE}>
              {editingAssistant ? 'Editar Asistente' : 'Nuevo Asistente'}
            </Text>
            <TouchableOpacity onPress={handleAssistantSave}>
              <Text style={createTextStyle(TYPOGRAPHY.MODAL_BUTTON, { color: COLORS.PRIMARY })}>Guardar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={COMMON_STYLES.modalContent}>
            <View style={COMMON_STYLES.formGroup}>
              <Text style={TYPOGRAPHY.FORM_LABEL}>Nombre</Text>
              <TextInput
                style={COMMON_STYLES.formInput}
                value={newAssistant.name}
                onChangeText={(text) => setNewAssistant({ ...newAssistant, name: text })}
                placeholder="Nombre del asistente"
              />
            </View>
            
            <View style={COMMON_STYLES.formGroup}>
              <Text style={TYPOGRAPHY.FORM_LABEL}>Descripción</Text>
              <TextInput
                style={COMMON_STYLES.formInput}
                value={newAssistant.description}
                onChangeText={(text) => setNewAssistant({ ...newAssistant, description: text })}
                placeholder="Breve descripción del asistente"
                multiline
              />
            </View>
            
            <View style={COMMON_STYLES.formGroup}>
              <Text style={TYPOGRAPHY.FORM_LABEL}>Instrucciones</Text>
              <TextInput
                style={[COMMON_STYLES.formInput, COMMON_STYLES.formTextArea]}
                value={newAssistant.instructions}
                onChangeText={(text) => setNewAssistant({ ...newAssistant, instructions: text })}
                placeholder="Instrucciones detalladas para el asistente..."
                multiline
                numberOfLines={6}
              />
            </View>
            
            <View style={COMMON_STYLES.formGroup}>
              <View style={COMMON_STYLES.switchRow}>
                <Text style={TYPOGRAPHY.FORM_LABEL}>Asistente por defecto</Text>
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
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 30,
  },
  providerType: {
    fontSize: 12,
    color: COLORS.TEXT.SECONDARY,
    backgroundColor: COLORS.BORDER.DEFAULT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  modelsContainer: {
    marginTop: 8,
  },
  noModelsText: {
    textAlign: 'center',
    color: COLORS.TEXT.TERTIARY,
    fontSize: 14,
    marginTop: 20,
  },
  loader: {
    marginTop: 20,
  },
});

export default SettingsScreen;