import React, { useRef, useState } from 'react';
import {
  Animated, Platform, StyleSheet, Text, TextInput, TextInputProps,
  TouchableOpacity, View, ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, spacing, typography } from '@/constants/theme';

/* ── Design tokens (kept local so the component is self-contained) ─── */
const PRIMARY        = '#2563EB';
const ICON_BG        = '#EFF6FF';
const BORDER_DEFAULT = '#E2E8F0';
const BORDER_FOCUS   = '#2563EB';
const BORDER_ERROR   = '#EF4444';
const TEXT_COLOR     = '#1E293B';
const PLACEHOLDER    = '#94A3B8';
const LABEL_COLOR    = '#475569';
const ERROR_COLOR    = '#EF4444';
const DISABLED_BG    = '#F8FAFC';

/* ── Render label with red asterisk when the string ends with " *" ─── */
function FieldLabel({ label }: { label: string }) {
  const hasRequired = label.endsWith(' *');
  const base = hasRequired ? label.slice(0, -2) : label;
  return (
    <Text style={styles.label}>
      {base}
      {hasRequired && <Text style={{ color: ERROR_COLOR }}> *</Text>}
    </Text>
  );
}

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
  style, editable = true,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  function onFocus() {
    setFocused(true);
    Animated.timing(glowAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    rest.onFocus?.({ nativeEvent: {} } as any);
  }
  function onBlur() {
    setFocused(false);
    Animated.timing(glowAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    rest.onBlur?.({ nativeEvent: {} } as any);
  }

  const borderColor = error ? BORDER_ERROR : focused ? BORDER_FOCUS : BORDER_DEFAULT;
  const borderWidth = focused || !!error ? 1.5 : 1;
  const bgColor     = !editable ? DISABLED_BG : '#FFFFFF';

  const shadowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(37,99,235,0)', 'rgba(37,99,235,0.18)'],
  });

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <FieldLabel label={label} /> : null}

      <Animated.View
        style={[
          styles.row,
          {
            borderColor,
            borderWidth,
            backgroundColor: bgColor,
          },
          Platform.OS === 'ios'
            ? {
                shadowColor: focused ? PRIMARY : '#000',
                shadowOffset: { width: 0, height: focused ? 0 : 2 },
                shadowOpacity: focused ? 0.18 : 0.06,
                shadowRadius: focused ? 8 : 4,
              }
            : { elevation: focused ? 4 : 2 },
        ]}
      >
        {leadingIcon ? (
          <View style={styles.iconBadge}>
            <Feather name={leadingIcon} size={20} color={PRIMARY} />
          </View>
        ) : null}

        {prefix ? (
          <View style={styles.prefixWrap}>
            <Text style={[typography.body, { color: TEXT_COLOR, fontWeight: '600' }]}>{prefix}</Text>
            <View style={styles.prefixDivider} />
          </View>
        ) : null}

        <TextInput
          style={[styles.input, typography.body, { color: TEXT_COLOR }, style]}
          placeholderTextColor={PLACEHOLDER}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={isPassword && !showPw}
          editable={editable}
          {...rest}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPw(v => !v)}
            style={styles.trailIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name={showPw ? 'eye-off' : 'eye'} size={18} color={PLACEHOLDER} />
          </TouchableOpacity>
        ) : trailingIcon ? (
          <TouchableOpacity
            onPress={onTrailingIconPress}
            style={styles.trailIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name={trailingIcon} size={18} color={PLACEHOLDER} />
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={12} color={ERROR_COLOR} />
          <Text style={[typography.caption, { color: ERROR_COLOR }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[typography.caption, { color: PLACEHOLDER, marginTop: 4 }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:  { marginBottom: spacing.md },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: LABEL_COLOR,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    height: 58,
    overflow: 'hidden',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 4,
  },
  trailIcon:    { marginRight: spacing.md },
  prefixWrap:   { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md },
  prefixDivider: { width: 1, height: 22, marginHorizontal: spacing.sm, backgroundColor: BORDER_DEFAULT },
  input:        { paddingHorizontal: 18, height: '100%', flex: 1 },
  errorRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});
