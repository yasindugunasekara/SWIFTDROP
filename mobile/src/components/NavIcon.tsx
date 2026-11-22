import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface IconProps {
  name: 'home' | 'orders' | 'track' | 'account';
  active: boolean;
  size?: number;
  color?: string;
}

export default function NavIcon({ name, active, size = 20, color }: IconProps) {
  const iconColor = color || (active ? '#000000' : '#71717a');

  if (Platform.OS === 'web') {
    if (name === 'home') {
      return React.createElement(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: active ? iconColor : 'none',
          stroke: iconColor,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        React.createElement('path', {
          d: 'M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z',
          fill: active ? iconColor : 'none',
          stroke: iconColor,
        })
      );
    }

    if (name === 'orders') {
      return React.createElement(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: iconColor,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        React.createElement('path', {
          d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
          fill: active ? iconColor : 'none',
        }),
        React.createElement('polyline', {
          points: '3.27 6.96 12 12.01 20.73 6.96',
          stroke: active ? '#ffffff' : iconColor,
        }),
        React.createElement('line', {
          x1: '12',
          y1: '22.08',
          x2: '12',
          y2: '12',
          stroke: active ? '#ffffff' : iconColor,
        })
      );
    }

    if (name === 'track') {
      return React.createElement(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: active ? iconColor : 'none',
          stroke: iconColor,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        React.createElement('path', {
          d: 'M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z',
          fill: active ? iconColor : 'none',
          stroke: iconColor,
        }),
        React.createElement('circle', {
          cx: '12',
          cy: '10',
          r: '3',
          fill: active ? '#ffffff' : 'none',
          stroke: active ? '#ffffff' : iconColor,
        })
      );
    }

    if (name === 'account') {
      return React.createElement(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: active ? iconColor : 'none',
          stroke: iconColor,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        React.createElement('path', {
          d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
          fill: active ? iconColor : 'none',
          stroke: iconColor,
        }),
        React.createElement('circle', {
          cx: '12',
          cy: '7',
          r: '4',
          fill: active ? iconColor : 'none',
          stroke: iconColor,
        })
      );
    }
  }

  // Native monochrome glyphs
  const glyphs: Record<string, string> = {
    home: active ? '■' : '□',
    orders: active ? '▣' : '▢',
    track: active ? '●' : '○',
    account: active ? '◆' : '◇',
  };

  return (
    <Text style={[styles.monochromeGlyph, { color: iconColor, fontSize: size }]}>
      {glyphs[name] || '•'}
    </Text>
  );
}

const styles = StyleSheet.create({
  monochromeGlyph: {
    fontWeight: '900',
    textAlign: 'center',
  },
});
