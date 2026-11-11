import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText, ChevronRight, TrendingUp } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import { Card, Button } from '../../../src/components';
import { meetings } from '../../../src/mocks/data';

export default function AdminReportsTabScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Manager Reports</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Daily visit summaries and field analytics
        </Text>
      </View>

      <Card surface="surface" style={styles.heroReportCard}>
        <TrendingUp size={24} color={theme.colors.accent} />
        <Text style={[styles.reportCardTitle, { color: theme.colors.text }]}>
          Today&apos;s Field Report (Salesman A)
        </Text>
        <Text style={[styles.reportCardSub, { color: theme.colors.muted }]}>
          5 visits logged · ₹25,000 revenue closed · 1 voice note transcribed
        </Text>
        <Button
          title="Open detailed report"
          onPress={() => router.push('/admin/report/m-3')}
          variant="primary"
          size="compact"
          style={{ marginTop: 8 }}
        />
      </Card>

      <Text style={[styles.sectionHeading, { color: theme.colors.muted }]}>
        RECENT LOGGED VISITS
      </Text>

      <View style={styles.reportsList}>
        {meetings.map((m) => (
          <Card
            key={m.id}
            surface="surface"
            style={styles.meetingItemCard}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={[styles.clientName, { color: theme.colors.text }]}>
                  {m.clientName}
                </Text>
                <Text style={[styles.subText, { color: theme.colors.muted }]}>
                  {m.businessType} · {m.outcome}
                </Text>
              </View>
              <Button
                title="View"
                onPress={() => router.push(`/admin/report/${m.id}`)}
                variant="outline"
                size="small"
                fullWidth={false}
                style={{ height: 36, paddingHorizontal: 14 }}
              />
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 26,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  heroReportCard: {
    padding: 20,
    gap: 10,
  },
  reportCardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
  },
  reportCardSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeading: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 8,
  },
  reportsList: {
    gap: 12,
  },
  meetingItemCard: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  subText: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});

