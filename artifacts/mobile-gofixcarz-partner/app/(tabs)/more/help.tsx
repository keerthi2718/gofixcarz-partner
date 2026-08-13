import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  HelpCircle,
  PhoneCall,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Wrench,
  Clock,
  ShieldCheck,
} from 'lucide-react-native';

const BG      = '#F8FAFC';
const CARD    = '#FFFFFF';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';
const PRIMARY = '#2563EB';
const BORDER  = '#E2E8F0';
const SOFT_BG = '#EFF6FF';

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: 'How do I create a new digital job card for a vehicle?',
    a: 'Go to the Jobs tab and tap "+ Create Job Card". Enter customer details, vehicle registration, and select services or inspect parts before saving.',
  },
  {
    q: 'How do customers discover my workshop on GoFixCarz?',
    a: 'When your garage profile address and location coordinates are verified, your workshop automatically appears to local vehicle owners searching for car service packages in your city.',
  },
  {
    q: 'Can I add custom service packages and pricing?',
    a: 'Yes! Navigate to the Services tab to create, edit, or toggle custom repair packages, labour charges, and package inclusions.',
  },
  {
    q: 'What should I do if a customer cancels a booking?',
    a: 'Open the Bookings tab, select the specific booking, and tap "Reject" or "Cancel". The system will update the booking status and notify the customer.',
  },
  {
    q: 'How do I update my workshop logo or contact info?',
    a: 'Go to the More tab, tap your Profile header or "Edit Profile", and upload your new garage logo or update contact numbers.',
  },
];

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  function toggleFaq(idx: number) {
    setOpenFaq(prev => (prev === idx ? null : idx));
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? 14 : 10) + insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Help &amp; Support</Text>
          <Text style={styles.headerSub}>Partner Assistance &amp; FAQs</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Channels Grid */}
        <Text style={styles.sectionHeading}>CONTACT PARTNER SUPPORT</Text>

        <View style={styles.channelsGrid}>
          <TouchableOpacity
            style={styles.channelCard}
            onPress={() => Linking.openURL('tel:18004634922')}
            activeOpacity={0.8}
          >
            <View style={[styles.channelIcon, { backgroundColor: '#EFF6FF' }]}>
              <PhoneCall size={20} color={PRIMARY} strokeWidth={2.2} />
            </View>
            <Text style={styles.channelTitle}>Call Support</Text>
            <Text style={styles.channelSub}>Toll-free 1800-GOFIX-CARZ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.channelCard}
            onPress={() => Linking.openURL('mailto:support@gofixcarz.com?subject=Partner%20Support%20Request')}
            activeOpacity={0.8}
          >
            <View style={[styles.channelIcon, { backgroundColor: '#F0FDF4' }]}>
              <Mail size={20} color="#059669" strokeWidth={2.2} />
            </View>
            <Text style={styles.channelTitle}>Email Desk</Text>
            <Text style={styles.channelSub}>support@gofixcarz.com</Text>
          </TouchableOpacity>
        </View>

        {/* Support Hours Card */}
        <View style={styles.hoursCard}>
          <Clock size={18} color={PRIMARY} strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hoursTitle}>Support Hours</Text>
            <Text style={styles.hoursSub}>Monday – Saturday: 9:00 AM to 8:00 PM IST</Text>
          </View>
        </View>

        {/* FAQs Section */}
        <Text style={styles.sectionHeading}>FREQUENTLY ASKED QUESTIONS</Text>

        <View style={styles.faqWrap}>
          {FAQS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <View key={i} style={[styles.faqCard, isOpen && styles.faqCardActive]}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => toggleFaq(i)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.faqQ, isOpen && styles.faqQActive]}>{item.q}</Text>
                  {isOpen ? (
                    <ChevronUp size={18} color={PRIMARY} strokeWidth={2.5} />
                  ) : (
                    <ChevronDown size={18} color={MUTED} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqA}>{item.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT, textAlign: 'center' },
  headerSub:   { fontSize: 11, color: MUTED, marginTop: 1, textAlign: 'center' },

  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },

  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  channelsGrid: { flexDirection: 'row', gap: 12 },
  channelCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  channelTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  channelSub:   { fontSize: 11, color: MUTED, textAlign: 'center' },

  hoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SOFT_BG,
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  hoursTitle: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  hoursSub:   { fontSize: 12, color: '#334155', marginTop: 1 },

  faqWrap: { gap: 10 },
  faqCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  faqCardActive: { borderColor: PRIMARY },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 16,
  },
  faqQ:       { flex: 1, fontSize: 13.5, fontWeight: '600', color: TEXT, lineHeight: 19 },
  faqQActive: { color: PRIMARY, fontWeight: '700' },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  faqA: { fontSize: 13, color: '#475569', lineHeight: 20 },
});
