import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import { Card, Button, LoadingView, ErrorView, EmptyView } from '../../../src/components';
import { crmService } from '../../../src/services';
import { formatDateTime, formatINR } from '../../../src/utils/format';

export default function AdminReportsTabScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const overview = useQuery({ queryKey: ['admin-overview'], queryFn: crmService.getAdminOverview });
  const meetings = useQuery({
    queryKey: ['admin-meetings'],
    queryFn: () => crmService.getAllMeetings(50),
  });

  if (overview.isLoading || meetings.isLoading) return <LoadingView message="Loading reports..." />;
  if (overview.error || meetings.error || !overview.data || !meetings.data) {
    const err = overview.error ?? meetings.error;
    return (
      <ErrorView
        message={err?.message ?? 'Could not load reports'}
        onRetry={() => {
          overview.refetch();
          meetings.refetch();
        }}
      />
    );
  }

  const o = overview.data;
  const list = meetings.data;
  const latest = list[0];

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
          Today&apos;s field report
        </Text>
        <Text style={[styles.reportCardSub, { color: theme.colors.muted }]}>
          {o.visitsDone} visits logged · {formatINR(o.dealValueTotal)} closed · {o.followupsOverdue}{' '}
          follow-ups overdue
        </Text>
        {latest ? (
          <Button
            title="Open latest visit report"
            onPress={() => router.push(`/admin/report/${latest.id}`)}
            variant="primary"
            size="compact"
            style={{ marginTop: 8 }}
          />
        ) : null}
      </Card>

      <Text style={[styles.sectionHeading, { color: theme.colors.muted }]}>
        RECENT LOGGED VISITS
      </Text>

      {list.length === 0 ? (
        <EmptyView title="No visits yet" description="Visits logged by your team will show here." />
      ) : (
        <View style={styles.reportsList}>
          {list.map((m) => (
            <Card key={m.id} surface="surface" style={styles.meetingItemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.clientName, { color: theme.colors.text }]}>
                    {m.clientName}
                  </Text>
                  <Text style={[styles.subText, { color: theme.colors.muted }]}>
                    {m.salesmanName} · {m.outcome} · {formatDateTime(m.checkInAt)}
                  </Text>
                </View>
                <Button
                  title="View"
                  onPress={() => router.push(`/admin/report/${m.id}`)}
                  variant="outline"
                  size="small"
                  fullWidth={false}
                  accessibilityLabel={`View report for ${m.clientName}`}
                />
              </View>
            </Card>
          ))}
        </View>
      )}
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
