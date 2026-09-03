import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity,
  TouchableWithoutFeedback, View,
} from 'react-native';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ── Tokens — mirror InputField exactly ─────────────────────────── */
const BORDER_DEFAULT = '#E2E8F0';
const BORDER_FOCUS   = '#2563EB';
const BORDER_ERROR   = '#EF4444';
const TEXT_COLOR     = '#1E293B';
const PLACEHOLDER    = '#94A3B8';
const LABEL_COLOR    = '#475569';
const ERROR_COLOR    = '#EF4444';
const DISABLED_BG    = '#F8FAFC';
const PRIMARY_ICON   = '#2563EB';
const ICON_BG        = '#EFF6FF';
const PRIMARY_BRAND  = '#2563EB';

/* ── Field label (matches InputField's FieldLabel) ──────────────── */
function FieldLabel({ label }: { label: string }) {
  const hasRequired = label.endsWith(' *');
  const base = hasRequired ? label.slice(0, -2) : label;
  return (
    <Text style={st.label}>
      {base}
      {hasRequired && <Text style={{ color: ERROR_COLOR }}> *</Text>}
    </Text>
  );
}

/* ── Props ──────────────────────────────────────────────────────── */
export interface SelectDropdownProps {
  /** Label shown above the field. Append " *" to show a red asterisk. */
  label?: string;
  /** Currently selected value (empty string = nothing selected). */
  value: string;
  /** Called when the user picks an option. */
  onChange: (value: string) => void;
  /** Full list of options to display / search. */
  options: string[];
  /** Placeholder shown when value is empty. */
  placeholder?: string;
  /** Grey out and block interaction. */
  disabled?: boolean;
  /** Red border + error message below the field. */
  error?: string;
  /** Optional Feather icon inside the left badge (same as InputField). */
  leadingIcon?: React.ComponentProps<typeof Feather>['name'];
  /** Show a search bar inside the sheet. Defaults to true when options > 8. */
  searchable?: boolean;
}

export default function SelectDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  error,
  leadingIcon,
  searchable,
}: SelectDropdownProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [kbHeight, setKbHeight] = useState(0);
  const searchRef             = useRef<TextInput>(null);

  const showSearch = searchable ?? options.length > 8;

  React.useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKbHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKbHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  function openSheet() {
    if (disabled) return;
    Keyboard.dismiss();
    setQuery('');
    setOpen(true);
  }

  function pick(option: string) {
    Keyboard.dismiss();
    onChange(option);
    setOpen(false);
    setQuery('');
  }

  function close() {
    Keyboard.dismiss();
    setOpen(false);
    setQuery('');
  }

  const hasValue   = value.length > 0;
  const borderColor = error ? BORDER_ERROR : BORDER_DEFAULT;
  const borderWidth = error ? 1.5 : 1;
  const bgColor     = disabled ? DISABLED_BG : '#FFFFFF';

  return (
    <View style={st.wrapper}>
      {label ? <FieldLabel label={label} /> : null}

      {/* ── Trigger row — matches InputField height/shape exactly ── */}
      <TouchableOpacity
        onPress={openSheet}
        activeOpacity={disabled ? 1 : 0.75}
        style={[
          st.trigger,
          {
            borderColor,
            borderWidth,
            backgroundColor: bgColor,
          },
        ]}
      >
        {leadingIcon ? (
          <View style={st.iconSlot}>
            <Feather name={leadingIcon} size={16} color={open ? PRIMARY_BRAND : '#9CA3AF'} />
          </View>
        ) : null}

        <Text
          style={[
            st.triggerText,
            { color: hasValue ? TEXT_COLOR : PLACEHOLDER },
            disabled && { color: PLACEHOLDER },
          ]}
          numberOfLines={1}
        >
          {hasValue ? value : placeholder}
        </Text>

        <Feather
          name="chevron-down"
          size={16}
          color={disabled ? '#CBD5E1' : '#94A3B8'}
          style={st.chevron}
        />
      </TouchableOpacity>

      {/* Error message */}
      {error ? (
        <View style={st.errorRow}>
          <Feather name="alert-circle" size={12} color={ERROR_COLOR} />
          <Text style={st.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── Bottom-sheet modal — only mounted when open ─────────── */}
      {open && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={close}
        >
          <KeyboardAvoidingView
            style={st.keyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableWithoutFeedback onPress={close}>
              <View style={st.backdrop} />
            </TouchableWithoutFeedback>

            <View
              style={[
                st.sheet,
                {
                  paddingBottom: Math.max(insets.bottom, 12),
                  marginBottom: Platform.OS === 'android' ? kbHeight : 0,
                  maxHeight: kbHeight > 0 ? '55%' : '80%',
                },
              ]}
            >
              {/* Handle */}
              <View style={st.handle} />

              {/* Sheet header */}
              <View style={st.sheetHeader}>
                <Text style={st.sheetTitle}>{label?.replace(' *', '') ?? 'Select'}</Text>
                <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <View style={st.closeBtn}>
                    <Feather name="x" size={16} color={TEXT_COLOR} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Search bar */}
              {showSearch && (
                <View style={st.searchWrap}>
                  <Feather name="search" size={15} color={PLACEHOLDER} />
                  <TextInput
                    ref={searchRef}
                    style={st.searchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder={`Search ${label?.replace(' *', '') ?? 'options'}…`}
                    placeholderTextColor={PLACEHOLDER}
                    autoFocus={false}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                  {query.length > 0 && Platform.OS !== 'ios' && (
                    <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="x-circle" size={15} color={PLACEHOLDER} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Options list */}
              <FlatList
                data={filtered}
                keyExtractor={item => item}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                contentContainerStyle={filtered.length === 0 ? st.emptyContainer : undefined}
                style={st.list}
                renderItem={({ item }) => {
                  const selected = item === value;
                  return (
                    <TouchableOpacity
                      style={[st.option, selected && st.optionSelected]}
                      onPress={() => pick(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[st.optionText, selected && st.optionTextSelected]}>
                        {item}
                      </Text>
                      {selected && (
                        <View style={st.checkBadge}>
                          <Feather name="check" size={13} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={st.empty}>
                    <Feather name="search" size={28} color="#CBD5E1" />
                    <Text style={st.emptyText}>No results for "{query}"</Text>
                  </View>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  /* Field wrapper */
  wrapper: { marginBottom: 10 },

  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  /* Trigger — matches InputField row */
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 46,
    overflow: 'hidden',
  },
  iconSlot: {
    width: 42,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: TEXT_COLOR,
    paddingRight: 12,
  },
  chevron: { marginRight: 14 },

  /* Error */
  errorRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errorText: { fontSize: 12, color: ERROR_COLOR, flex: 1 },

  /* Keyboard Avoiding Container */
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  /* Backdrop */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  /* Bottom sheet */
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 260,
    flexShrink: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 20 },
      default: {},
    }),
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },

  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    flex: 1, fontSize: 16, fontWeight: '700', color: TEXT_COLOR,
  },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 12, marginBottom: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_COLOR },

  /* List */
  list: { marginTop: 8 },
  emptyContainer: { flexGrow: 1 },

  option: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  optionSelected: { backgroundColor: '#EFF6FF' },
  optionText:         { flex: 1, fontSize: 15, color: TEXT_COLOR, fontWeight: '500' },
  optionTextSelected: { color: PRIMARY_BRAND, fontWeight: '700' },
  checkBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: PRIMARY_BRAND,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Empty */
  empty:      { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText:  { fontSize: 14, color: PLACEHOLDER, textAlign: 'center' },
});
