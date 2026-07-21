import React from 'react';
import {
  ActivityIndicator, Platform, Pressable,
  StyleSheet, Text, View, ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radius, spacing, typography } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export default function PrimaryButton({
  label, onPress, loading, disabled,
  variant = 'primary', size = 'lg',
  style, fullWidth = true, icon,
}: Props) {
  const colors = useColors();

  const heights = { sm: 40, md: 48, lg: 56 };
  const radii   = { sm: radius.md, md: radius.md, lg: 14 };

  const bgMap: Record<string, string> = {
    primary:   colors.primary,
    secondary: colors.secondary,
    outline:   'transparent',
    ghost:     'transparent',
    danger:    colors.danger,
  };
  const textMap: Record<string, string> = {
    primary:   '#fff',
    secondary: colors.textSecondary,
    outline:   colors.primary,
    ghost:     colors.primary,
    danger:    '#fff',
  };
  const borderMap: Record<string, string> = {
    primary:   'transparent',
    secondary: 'transparent',
    outline:   colors.primary,
    ghost:     'transparent',
    danger:    'transparent',
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={variant === 'primary' ? { color: 'rgba(255,255,255,0.25)' } : undefined}
      style={({ pressed }) => [
        styles.btn,
        {
          height: heights[size],
          borderRadius: radii[size],
          backgroundColor: bgMap[variant],
          borderColor: borderMap[variant],
          borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: isDisabled ? 0.55 : pressed && Platform.OS === 'ios' ? 0.8 : 1,
          alignSelf: fullWidth ? undefined : 'flex-start',
          paddingHorizontal: fullWidth ? spacing.lg : spacing.xl,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={textMap[variant]} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon}
          <Text style={[styles.text, typography.body, { color: textMap[variant], fontWeight: '700' }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { letterSpacing: 0.3 },
});
