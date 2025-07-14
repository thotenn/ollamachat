import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@env';

interface MessageMenuProps {
  visible: boolean;
  onCopy: () => void;
  onClose: () => void;
}

const MessageMenu: React.FC<MessageMenuProps> = ({ visible, onCopy, onClose }) => {
  if (!visible) return null;
  return (
    <View style={styles.menuContainer}>
      <TouchableOpacity style={styles.menuItem} onPress={onCopy}>
        <Ionicons name="copy-outline" size={18} color={COLORS.TEXT.DARK} />
        <Text style={styles.menuText}>Copiar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuClose} onPress={onClose}>
        <Ionicons name="close" size={18} color={COLORS.TEXT.SECONDARY} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    position: 'absolute',
    top: 70, // Posicionar justo debajo del header
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.WHITE,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.BACKGROUND.LIGHT,
    marginRight: 8,
  },
  menuText: {
    marginLeft: 6,
    fontSize: 15,
    color: COLORS.TEXT.DARK,
  },
  menuClose: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: COLORS.BACKGROUND.LIGHTER,
  },
});

export default MessageMenu;
