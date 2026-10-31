import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '../theme/colors';

export type TabKey = 'home' | 'orders' | 'track' | 'account';

interface Props {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export default function BottomNavBar({ activeTab, onTabChange }: Props) {
  const tabs = [
    {
      key: 'home' as TabKey,
      label: 'Home',
      icon: (active: boolean) => (
        <View style={[styles.iconContainer, active && styles.activeIconContainer]}>
          <Text style={[styles.tabEmoji, active && styles.activeTabEmoji]}>🏠</Text>
        </View>
      ),
    },
    {
      key: 'orders' as TabKey,
      label: 'Orders',
      icon: (active: boolean) => (
        <View style={[styles.iconContainer, active && styles.activeIconContainer]}>
          <Text style={[styles.tabEmoji, active && styles.activeTabEmoji]}>📋</Text>
        </View>
      ),
    },
    {
      key: 'track' as TabKey,
      label: 'Track',
      icon: (active: boolean) => (
        <View style={[styles.iconContainer, active && styles.activeIconContainer]}>
          <Text style={[styles.tabEmoji, active && styles.activeTabEmoji]}>📍</Text>
        </View>
      ),
    },
    {
      key: 'account' as TabKey,
      label: 'Account',
      icon: (active: boolean) => (
        <View style={[styles.iconContainer, active && styles.activeIconContainer]}>
          <Text style={[styles.tabEmoji, active && styles.activeTabEmoji]}>👤</Text>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            {tab.icon(isActive)}
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
    position: 'relative',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  activeIconContainer: {
    backgroundColor: '#fff7ed',
  },
  tabEmoji: {
    fontSize: 18,
    color: '#94a3b8',
  },
  activeTabEmoji: {
    color: Colors.primary,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  activeTabLabel: {
    color: Colors.primary,
    fontWeight: '800',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    position: 'absolute',
    bottom: -6,
  },
});
