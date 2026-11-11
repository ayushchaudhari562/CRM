import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, FileDown, Check } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import {
  LineChart,
  Timeline,
  Waveform,
  Button,
  Card,
  TimelineItem,
} from '../../../src/components';
import { meetings } from '../../../src/mocks/data';

export default function AdminMeetingReportScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [downloaded, setDownloaded] = useState(false);

  // Timeline items matching mockup 08 exactly
  const timelineItems: TimelineItem[] = [
    {
      id: 't-1',
      clientName: 'Client D',
      statusLabel: 'Not interested',
      businessType: 'Kirana store',
      status: 'done',
      time: '9:40',
    },
    {
      id: 't-2',
      clientName: 'Client E',
      statusLabel: 'Interested',
      businessType: 'Hardware shop',
      status: 'done',
      time: '10:20',
    },
    {
      id: 't-3',
      clientName: 'Client A',
      statusLabel: 'Closed',
      dealValue: 25000,
      businessType: 'Kirana store',
      status: 'done',
      time: '11:02',
    },
    {
      id: 't-4',
      clientName: 'Client F',
      statusLabel: 'Interested',
      businessType: 'Pharmacy',
      status: 'done',
      time: '12:15',
    },
    {
      id: 't-5',
      clientName: 'Client B',
      statusLabel: 'In meeting',
      businessType: 'Hardware shop',
      status: 'in_progress',
      time: '13:30',
    },
    {
      id: 't-6',
      clientName: 'Client G',
      statusLabel: 'Planned',
      businessType: 'Stationery',
      status: 'planned',
      time: '15:00',
    },
  ];

  const handleDownloadPdf = () => {
    setDownloaded(true);
    Alert.alert('Report Downloaded', 'Salesman_A_Daily_Report_10Nov.pdf saved to device.');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Top Header Row */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: theme.colors.surface2, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <ChevronLeft size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.backText, { color: theme.colors.text }]}>Back</Text>

        {/* Salesman info badge */}
        <View style={styles.salesmanHeaderBadge}>
          <View
            style={[
              styles.avatarSmall,
              { backgroundColor: theme.colors.track },
            ]}
          >
            <Text style={[styles.avatarTextSmall, { color: theme.colors.text }]}>
              SA
            </Text>
          </View>
          <View style={styles.salesmanHeaderText}>
            <Text style={[styles.salesmanNameHeader, { color: theme.colors.text }]}>
              Salesman A
            </Text>
            <Text style={[styles.salesmanRoleHeader, { color: theme.colors.muted }]}>
              Field sales
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.headingBlock}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Meeting report</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            Visits today · 5 of 10
          </Text>
        </View>

        {/* SVG Line Chart */}
        <View style={styles.chartWrapper}>
          <LineChart />
        </View>

        {/* Next Visit Planned Card */}
        <View style={[styles.card, styles.nextVisitCard, { backgroundColor: theme.colors.surface }]}>
          {/* Circular 50% progress ring */}
          <View
            style={[
              styles.progressCircle,
              {
                borderColor: theme.colors.track,
                borderTopColor: theme.colors.accent,
                borderRightColor: theme.colors.accent,
              },
            ]}
          >
            <Text style={[styles.progressText, { color: theme.colors.text }]}>50%</Text>
          </View>

          <View style={styles.nextVisitDetails}>
            <Text style={[styles.nextVisitLabel, { color: theme.colors.muted }]}>
              Next visit planned
            </Text>
            <Text style={[styles.nextVisitValue, { color: theme.colors.text }]}>
              Client A · 15 Nov, 11:00 AM
            </Text>
          </View>
        </View>

        {/* Visit Timeline Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Timeline items={timelineItems} />
        </View>

        {/* Voice Note Player & AI Summary Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Waveform
            duration="00:24"
            aiSummary="Client ko rate thoda zyada laga. Sample dekhna chahta hai. 7 din baad dobara milne ko bola."
          />
        </View>

        {/* Download report PDF button */}
        <Button
          title={downloaded ? 'Report downloaded (PDF)' : 'Download report (PDF)'}
          onPress={handleDownloadPdf}
          variant="outline"
          size="normal"
          icon={downloaded ? <Check size={18} color={theme.colors.accent} /> : <FileDown size={18} color={theme.colors.text} />}
          style={styles.downloadBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  salesmanHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSmall: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  salesmanHeaderText: {
    gap: 1,
  },
  salesmanNameHeader: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  salesmanRoleHeader: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 16,
  },
  headingBlock: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 4,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 30,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  chartWrapper: {
    paddingHorizontal: 20,
  },
  card: {
    marginHorizontal: 12,
    borderRadius: 22,
    padding: 20,
    gap: 14,
  },
  nextVisitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  progressCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  nextVisitDetails: {
    flex: 1,
    gap: 2,
  },
  nextVisitLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  nextVisitValue: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  downloadBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 14,
  },
});

