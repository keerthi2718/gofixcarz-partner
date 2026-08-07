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
  ShieldCheck,
  Lock,
  Database,
  Eye,
  FileText,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Share2,
} from 'lucide-react-native';

const BG       = '#F8FAFC';
const CARD     = '#FFFFFF';
const TEXT     = '#0F172A';
const MUTED    = '#64748B';
const PRIMARY  = '#2563EB';
const BORDER   = '#E2E8F0';
const SOFT_BG  = '#EFF6FF';

interface PolicySection {
  id: string;
  icon: any;
  title: string;
  summary: string;
  details: string[];
}

const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'scope',
    icon: ShieldCheck,
    title: '1. Overview & Scope',
    summary: 'How GoFixCarz Partner collects and safeguards your garage & business data.',
    details: [
      'GoFixCarz Partner ("we", "our", or "us") is dedicated to protecting the privacy and security of automotive workshop owners, garage partners, and service personnel using our mobile app and digital garage management software.',
      'This Privacy Policy outlines how we collect, process, store, and protect your information when you register a partner account, manage customer bookings, issue job cards, or list service packages on the GoFixCarz network.',
      'By creating a partner account or accessing the GoFixCarz Partner platform, you agree to the collection and use of information in accordance with this policy.',
    ],
  },
  {
    id: 'collection',
    icon: Database,
    title: '2. Information We Collect',
    summary: 'Types of workshop, contact, location, and operational data gathered.',
    details: [
      'Workshop & Account Info: Partner owner name, workshop business name, primary and secondary mobile numbers, email address, physical workshop address, city, state, PIN code, and garage logo image.',
      'Customer & Job Data: Customer names, phone numbers, vehicle make/model/registration number, inspection logs, job card estimates, service packages, and invoice billing records created by your garage.',
      'Location Data: Precise GPS coordinates and workshop location used to map your garage on the GoFixCarz customer application for local customer discovery and distance calculation.',
      'Device & Usage Data: Push notification tokens, app activity logs, device OS details, and network diagnostic reports used to ensure app stability and delivery of booking alerts.',
    ],
  },
  {
    id: 'usage',
    icon: Eye,
    title: '3. How We Use Your Data',
    summary: 'Purposes for processing your business information.',
    details: [
      'To verify partner identity, process onboarding registrations, and activate your garage listing on the GoFixCarz network.',
      'To facilitate digital job card creation, customer booking management, status tracking (In Progress, QC Check, Ready), and invoice calculations.',
      'To display your workshop location, service packages, and contact information to nearby vehicle owners on the GoFixCarz Customer App.',
      'To send critical transactional notifications, SMS/WhatsApp OTP verifications, booking updates, and account security alerts.',
      'To generate internal business analytics, revenue reports, and service statistics for your workshop dashboard.',
    ],
  },
  {
    id: 'security',
    icon: Lock,
    title: '4. Data Security & Storage',
    summary: 'Encryption, secure storage, and protection standards.',
    details: [
      'All data transmitted between the GoFixCarz Partner app and our servers is secured using industry-standard 256-bit SSL/TLS encryption.',
      'Your authentication credentials and access tokens are securely stored using OS-level encrypted storage (Keychain on iOS and EncryptedSharedPreferences on Android).',
      'We maintain strict role-based access controls and routine vulnerability assessments to safeguard your customer records and business financial data against unauthorized access.',
    ],
  },
  {
    id: 'sharing',
    icon: FileText,
    title: '5. Data Sharing & Third Parties',
    summary: 'Controlled third-party services for maps, SMS, and analytics.',
    details: [
      'Google Maps API: Used for workshop address autocomplete, geocoding, and interactive map displays.',
      'Transactional SMS Gateways: Used strictly to deliver one-time OTP verification passcodes and customer job status updates.',
      'No Data Sale Policy: We NEVER sell, rent, or trade your workshop, customer, or revenue data to third-party advertisers or telemarketers.',
      'Legal Compliance: We may disclose information only if required by applicable law, regulation, or legal judicial order.',
    ],
  },
  {
    id: 'rights',
    icon: ShieldCheck,
    title: '6. Partner Rights & Data Control',
    summary: 'Updating, exporting, or requesting deletion of your partner data.',
    details: [
      'You retain full ownership of your business data. You can edit your workshop details, service catalog, and logo directly from the Partner Profile tab.',
      'You have the right to request a copy of your historical job cards, billing records, or account data.',
      'Account Deletion: If you wish to deactivate or permanently delete your partner account, submit a request to privacy@gofixcarz.com or contact Partner Support.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>('scope');

  function toggle(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <Text style={styles.headerSub}>Effective Date: January 1, 2026</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.shieldBadge}>
            <ShieldCheck size={22} color={PRIMARY} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Your Data &amp; Privacy Protected</Text>
            <Text style={styles.bannerDesc}>
              GoFixCarz Partner uses enterprise-grade encryption to safeguard your garage operations, customer records, and financial transactions.
            </Text>
          </View>
        </View>

        {/* Policy Accordion List */}
        <View style={styles.accordionWrap}>
          {POLICY_SECTIONS.map(sec => {
            const Icon = sec.icon;
            const isOpen = expandedId === sec.id;
            return (
              <View key={sec.id} style={[styles.sectionCard, isOpen && styles.sectionCardActive]}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => toggle(sec.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconWrap, isOpen && styles.iconWrapActive]}>
                    <Icon size={16} color={isOpen ? PRIMARY : MUTED} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.secTitle, isOpen && styles.secTitleActive]}>{sec.title}</Text>
                    <Text style={styles.secSummary} numberOfLines={1}>{sec.summary}</Text>
                  </View>
                  {isOpen ? (
                    <ChevronUp size={18} color={PRIMARY} strokeWidth={2.5} />
                  ) : (
                    <ChevronDown size={18} color={MUTED} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.sectionBody}>
                    {sec.details.map((p, idx) => (
                      <View key={idx} style={styles.paragraphRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.paragraphTxt}>{p}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Contact Support Section */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Questions About Privacy?</Text>
          <Text style={styles.contactSub}>Our legal and compliance team is here to assist you.</Text>

          <View style={styles.contactButtonsRow}>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL('mailto:privacy@gofixcarz.com?subject=Partner%20Privacy%20Query')}
              activeOpacity={0.8}
            >
              <Mail size={15} color={PRIMARY} strokeWidth={2.2} />
              <Text style={styles.contactBtnTxt}>privacy@gofixcarz.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL('tel:18004634922')}
              activeOpacity={0.8}
            >
              <Phone size={15} color={PRIMARY} strokeWidth={2.2} />
              <Text style={styles.contactBtnTxt}>1800-GOFIX-CARZ</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerNote}>
          GoFixCarz Technologies Pvt. Ltd. © 2026. All rights reserved.
        </Text>
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
    paddingVertical: 14,
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

  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },

  bannerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: SOFT_BG,
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  shieldBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: PRIMARY, marginBottom: 3 },
  bannerDesc:  { fontSize: 12, color: '#334155', lineHeight: 18 },

  accordionWrap: { gap: 12 },
  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  sectionCardActive: {
    borderColor: PRIMARY,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: SOFT_BG,
  },
  secTitle:       { fontSize: 14, fontWeight: '700', color: TEXT },
  secTitleActive: { color: PRIMARY },
  secSummary:     { fontSize: 12, color: MUTED, marginTop: 2 },

  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  paragraphRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
    marginTop: 6,
  },
  paragraphTxt: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 20 },

  contactCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  contactTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  contactSub:   { fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 4, marginBottom: 14 },
  contactButtonsRow: { width: '100%', gap: 10 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SOFT_BG,
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  contactBtnTxt: { fontSize: 13, fontWeight: '700', color: PRIMARY },

  footerNote: { fontSize: 11, color: MUTED, textAlign: 'center', marginVertical: 8 },
});
