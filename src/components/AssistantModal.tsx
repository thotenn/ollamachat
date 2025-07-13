import React from "react";
import { View, Text, Modal, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@env";
import {
  COMMON_STYLES,
  TYPOGRAPHY,
  createTextStyle,
} from "../styles/GlobalStyles";

interface Assistant {
  id: string;
  name: string;
  description: string;
}

interface AssistantModalProps {
  visible: boolean;
  assistants: Assistant[];
  selectedAssistantId: string;
  onClose: () => void;
  onAssistantChange: (assistantId: string) => void;
}

const AssistantModal: React.FC<AssistantModalProps> = ({
  visible,
  assistants,
  selectedAssistantId,
  onClose,
  onAssistantChange,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      transparent={false}
    >
      <SafeAreaView style={COMMON_STYLES.modalContainer}>
        <View style={COMMON_STYLES.header}>
          <View style={COMMON_STYLES.headerLeft}>
            <Text style={TYPOGRAPHY.MODAL_TITLE}>Seleccionar Asistente</Text>
          </View>
          <View style={COMMON_STYLES.headerRight}>
            <TouchableOpacity onPress={onClose}>
              <Text
                style={createTextStyle(TYPOGRAPHY.MODAL_BUTTON, {
                  color: COLORS.TEXT.SECONDARY,
                })}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={COMMON_STYLES.modalContent}>
          {assistants.map((assistant) => (
            <TouchableOpacity
              key={assistant.id}
              style={[
                COMMON_STYLES.selectableItem,
                selectedAssistantId === assistant.id &&
                  COMMON_STYLES.selectableItemSelected,
              ]}
              onPress={() => onAssistantChange(assistant.id)}
            >
              <View style={COMMON_STYLES.itemMain}>
                <Text
                  style={createTextStyle(TYPOGRAPHY.BODY_LARGE, {
                    color:
                      selectedAssistantId === assistant.id
                        ? COLORS.PRIMARY
                        : COLORS.TEXT.DARK,
                    fontWeight:
                      selectedAssistantId === assistant.id ? "600" : "normal",
                    marginBottom: 4,
                  })}
                >
                  {assistant.name}
                </Text>
                <Text style={TYPOGRAPHY.BODY_MEDIUM}>
                  {assistant.description}
                </Text>
              </View>
              {selectedAssistantId === assistant.id && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.PRIMARY}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = {
  modalPlaceholder: {
    width: 60,
  },
};

export default AssistantModal;
