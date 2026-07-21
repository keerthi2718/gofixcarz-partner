import React, { useState } from 'react';
import {
  StyleSheet, Text, TextInput, TextInputProps,
  TouchableOpacity, View, ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { radius, spacing, typography } from '@/constants/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: keyof typeof Feather.glyphMap;
  trailingIcon?: keyof typeof Feather.glyphMap;
  onTrailingIconPress?: () => void;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  prefix?: string;
}

export default function InputField({
  label, error, hint,
  leadingIcon, trailingIcon, onTrailingIconPress,
  containerStyle, isPassword, prefix,
  style,
  ...rest
}: Props) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const borderColor = error
    ? colors.danger
    : focused
    ? colors.primary
    : colors.border;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>
          {label}
        </Text>
      ) : null}

      <View style={[
        styles.row,
        {
          borderColor,
          backgroundColor: focused ? colors.surface : colors.inputBackground,
          borderWidth: focused || error ? 1.5 : 1,
        },
      ]}>
        {leadingIcon ? (
          <Feather name={leadingIcon} size={18} color={focused ? colors.primary : colors.textDisabled} style={styles.leadIcon} />
        ) : null}
        {prefix ? (
          <View style={styles.prefixWrap}>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{prefix}</Text>
            <View style={[styles.prefixDivider, { backgroundColor: colors.border }]} />
          </View>
        ) : null}
        <TextInput
          style={[
            styles.input,
            typography.body,
            { color: colors.text, flex: 1 },
            style,
          ]}
          placeholderTextColor={colors.textDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && !showPw}
          {...rest}
        />
        {isPassword ? (
          <TouchableOpacity onPress={() => setShowPw(v => !v)} style={styles.trailIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name={showPw ? 'eye-off' : 'eye'} size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        ) : trailingIcon ? (
          <TouchableOpacity onPress={onTrailingIconPress} style={styles.trailIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name={trailingIcon} size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={12} color={colors.danger} />
          <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, height: 52, overflow: 'hidden',
  },
  leadIcon: { marginLeft: spacing.md, marginRight: 4 },
  trailIcon: { marginRight: spacing.md },
  prefixWrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md },
  prefixDivider: { width: 1, height: 22, marginHorizontal: spacing.sm },
  input: { paddingHorizontal: spacing.md, height: '100%' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});
