import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import NavIcon from './NavIcon';

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
      iconName: 'home' as const,
    },
    {
      key: 'orders' as TabKey,
      label: 'Orders',
      iconName: 'orders' as const,
    },
    {
      key: 'track' as TabKey,
      label: 'Track',
      iconName: 'track' as const,
    },
    {
      key: 'account' as TabKey,
      label: 'Account',
      iconName: 'account' as const,
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
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
              <NavIcon
                name={tab.iconName}
                active={isActive}
                size={20}
                color={isActive ? '#ffffff' : '#52525b'}
              />
            </View>
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
    borderTopColor: '#e4e4e7',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
    width: 38,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'transparent',
    transition: 'all 0.15s ease',
  } as any,
  activeIconContainer: {
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717a',
    marginTop: 3,
    letterSpacing: -0.2,
  },
  activeTabLabel: {
    color: '#000000',
    fontWeight: '900',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
    position: 'absolute',
    bottom: -6,
  },
});
