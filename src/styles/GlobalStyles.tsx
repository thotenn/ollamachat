import { StyleSheet } from 'react-native';
import { COLORS } from '@env';

// Typography Scale
export const TYPOGRAPHY = {
  // Headers
  HEADER_TITLE: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: COLORS.TEXT.DARK,
  },
  HEADER_SUBTITLE: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 4,
  },
  
  // Section Titles
  SECTION_TITLE: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.TEXT.DARK,
  },
  SECTION_SUBTITLE: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 12,
  },
  
  // Body Text
  BODY_LARGE: {
    fontSize: 16,
    color: COLORS.TEXT.DARK,
  },
  BODY_MEDIUM: {
    fontSize: 14,
    color: COLORS.TEXT.DARK,
  },
  BODY_SMALL: {
    fontSize: 12,
    color: COLORS.TEXT.SECONDARY,
  },
  
  // Button Text
  BUTTON_PRIMARY: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.TEXT.WHITE,
  },
  BUTTON_SECONDARY: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.PRIMARY,
  },
  
  // Modal Text
  MODAL_TITLE: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.TEXT.DARK,
  },
  MODAL_BUTTON: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  
  // Labels
  FORM_LABEL: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.TEXT.DARK,
    marginBottom: 8,
  },
  
  // Status Text
  STATUS_TEXT: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
  },
};

// Common Styles
export const COMMON_STYLES = StyleSheet.create({
  // Containers
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.LIGHTER,
  },
  
  header: {
    backgroundColor: COLORS.BACKGROUND.WHITE,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.DEFAULT,
  },
  
  section: {
    backgroundColor: COLORS.BACKGROUND.WHITE,
    marginTop: 16,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: COLORS.SHADOW.DARK,
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
  
  // Items
  selectableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER.DEFAULT,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORS.BACKGROUND.LIGHT,
  },
  
  selectableItemSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.BACKGROUND.SELECTED,
  },
  
  itemMain: {
    flex: 1,
  },
  
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Buttons
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
  },
  
  primaryButtonDisabled: {
    backgroundColor: COLORS.BORDER.LIGHT,
  },
  
  iconButton: {
    padding: 8,
  },
  
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  
  addButton: {
    padding: 4,
  },
  
  // Status
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
  
  // Empty States
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modals
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.WHITE,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.DEFAULT,
  },
  
  modalContent: {
    flex: 1,
    padding: 16,
  },
  
  // Forms
  formGroup: {
    marginBottom: 20,
  },
  
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHTER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: COLORS.BACKGROUND.LIGHT,
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
  
  // Badges
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.BADGE,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  // Lists
  listContainer: {
    padding: 16,
  },
  
  listItem: {
    backgroundColor: COLORS.BACKGROUND.WHITE,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: COLORS.SHADOW.DARK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  
  listItemContent: {
    padding: 16,
  },
});

// Helper function to create text styles
export const createTextStyle = (baseStyle: object, overrides?: object) => {
  return { ...baseStyle, ...overrides };
};
