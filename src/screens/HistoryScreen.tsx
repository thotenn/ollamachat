import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ChatConversation } from '../types';
import databaseService from '../services/databaseService';
import { COLORS } from '@env';
import { COMMON_STYLES, TYPOGRAPHY, createTextStyle } from '../styles/GlobalStyles';

interface HistoryScreenProps {
  onSelectConversation: (conversationId: string) => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await databaseService.getConversations();
      setConversations(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  useEffect(() => {
    const initDatabase = async () => {
      try {
        await databaseService.initDatabase();
        await loadConversations();
      } catch (error) {
        Alert.alert('Error', 'Failed to initialize database');
      }
    };

    initDatabase();
  }, [loadConversations]);

  const handleDeleteConversation = useCallback((conversationId: string, title: string) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteConversation(conversationId);
              await loadConversations();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  }, [loadConversations]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderConversationItem = ({ item }: { item: ChatConversation }) => (
    <TouchableOpacity
      style={COMMON_STYLES.listItem}
      onPress={() => onSelectConversation(item.id)}
      activeOpacity={0.7}
    >
      <View style={COMMON_STYLES.listItemContent}>
        <View style={styles.conversationHeader}>
          <Text 
            style={[
              createTextStyle(TYPOGRAPHY.BODY_LARGE, { fontWeight: '600', lineHeight: 22 }),
              styles.conversationTitle
            ]} 
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <TouchableOpacity
            style={COMMON_STYLES.iconButton}
            onPress={() => handleDeleteConversation(item.id, item.title)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.DESTRUCTIVE} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.conversationFooter}>
          <View style={COMMON_STYLES.badge}>
            <Ionicons name="cube-outline" size={12} color={COLORS.PRIMARY} />
            <Text style={createTextStyle(TYPOGRAPHY.BODY_SMALL, { color: COLORS.PRIMARY, marginLeft: 4, fontWeight: '500' })}>{item.model}</Text>
          </View>
          <Text style={TYPOGRAPHY.BODY_SMALL}>{formatDate(item.updatedAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={COMMON_STYLES.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={COLORS.BORDER.LIGHT} />
      <Text style={createTextStyle(TYPOGRAPHY.BODY_LARGE, { fontWeight: '600', color: COLORS.TEXT.SECONDARY, marginTop: 16, marginBottom: 8 })}>No conversations yet</Text>
      <Text style={createTextStyle(TYPOGRAPHY.BODY_MEDIUM, { color: COLORS.TEXT.TERTIARY, textAlign: 'center', lineHeight: 22 })}>
        Start a new chat to see your conversation history here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={COMMON_STYLES.screenContainer}>
        <View style={COMMON_STYLES.header}>
          <Text style={TYPOGRAPHY.HEADER_TITLE}>Chat History</Text>
        </View>
        <View style={COMMON_STYLES.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={createTextStyle(TYPOGRAPHY.BODY_MEDIUM, { color: COLORS.TEXT.SECONDARY, marginTop: 16 })}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={COMMON_STYLES.screenContainer}>
      <View style={COMMON_STYLES.header}>
        <View style={COMMON_STYLES.headerLeft}>
          <Text style={TYPOGRAPHY.HEADER_TITLE}>Chat History</Text>
        </View>
        <View style={COMMON_STYLES.headerRight}>
          <View style={COMMON_STYLES.badge}>
            <Text style={createTextStyle(TYPOGRAPHY.HEADER_SUBTITLE, { color: COLORS.PRIMARY, marginLeft: 4, fontWeight: '500' })}>{conversations.length}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          COMMON_STYLES.listContainer,
          conversations.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  conversationTitle: {
    flex: 1,
    marginRight: 12,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyListContainer: {
    flex: 1,
  },
});

export default HistoryScreen;