import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import { LoadingView, ErrorView } from '../../../src/components';
import { crmService } from '../../../src/services';
import type { FieldStatus, SalesmanProgress } from '../../../src/types';
import { formatINR, timeAgo } from '../../../src/utils/format';

export default function AdminLiveMonitoringScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const {
    data: progressList,
    isLoading,
    error,
    refetch,
  } = useQuery<SalesmanProgress[]>({
    queryKey: ['admin-progress'],
    refetchInterval: 60_000, // live screen: refresh every minute
    queryFn: () => crmService.getSalesmanProgress(),
  });

  if (isLoading) {
    return <LoadingView message="Loading live salesman tracking..." />;
  }

  if (error || !progressList) {
    return (
      <ErrorView
        message={error?.message ?? 'Could not load live monitoring'}
        onRetry={() => refetch()}
      />
    );
  }

  const total = progressList.length;
  const count = (st: FieldStatus) => progressList.filter((p) => p.status === st).length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const rows = [
    { label: 'In meeting' as const, color: theme.colors.accent },
    { label: 'On the road' as const, color: theme.colors.text },
    { label: 'Not started' as const, color: theme.colors.statusIdle },
  ].map((r) => ({ ...r, n: count(r.label) }));

  const filteredSalesmen = progressList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: theme.colors.surface2, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <ChevronLeft size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.backText, { color: theme.colors.text }]}>Back</Text>

        <Pressable
          onPress={() => setIsSearching(!isSearching)}
          accessibilityRole="button"
          accessibilityLabel="Search salesmen"
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: theme.colors.surface2, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          {isSearching ? (
            <X size={20} color={theme.colors.text} />
          ) : (
            <Search size={20} color={theme.colors.text} />
          )}
        </Pressable>
      </View>

      {/* Search Input Bar if searching */}
      {isSearching ? (
        <View style={styles.searchBarWrapper}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search salesman by name..."
            placeholderTextColor={theme.colors.muted}
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.surface2,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            autoFocus
          />
        </View>
      ) : null}

      {/* Header Heading */}
      <View style={styles.headingBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Live monitoring</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {total} salesmen · updates every minute
        </Text>
      </View>

      {/* Segmented Status Bar */}
      <View style={styles.segmentedBarWrapper}>
        <View style={styles.segmentedBar}>
          {rows.map((r) =>
            r.n ? (
              <View
                key={r.label}
                style={[styles.barSegment, { flex: r.n, backgroundColor: r.color }]}
              />
            ) : null,
          )}
        </View>
      </View>

      {/* Field status card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Field status</Text>

        {rows.map((r) => (
          <View key={r.label} style={styles.statusRow}>
            <View style={[styles.statusSquare, { backgroundColor: r.color }]} />
            <Text style={[styles.statusLabel, { color: theme.colors.text }]}>{r.label}</Text>
            <Text style={[styles.statusFraction, { color: theme.colors.muted }]}>
              {r.n}/{total}
            </Text>
            <Text style={[styles.statusPercent, { color: theme.colors.text }]}>{pct(r.n)}%</Text>
          </View>
        ))}
      </View>

      {/* Today&apos;s progress card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Today&apos;s progress</Text>

        <View style={styles.salesmenList}>
          {filteredSalesmen.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => s.lastMeetingId && router.push(`/admin/report/${s.lastMeetingId}`)}
              disabled={!s.lastMeetingId}
              accessibilityRole="button"
              accessibilityLabel={`${s.name}, ${s.status}, ${s.visits} visits today`}
              style={({ pressed }) => [styles.salesmanItem, { opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[styles.avatarBox, { backgroundColor: theme.colors.text }]}>
                <Text style={[styles.avatarText, { color: theme.colors.bg }]}>{s.initials}</Text>
              </View>

              <View style={styles.salesmanInfo}>
                <Text style={[styles.salesmanName, { color: theme.colors.text }]}>{s.name}</Text>
                <Text style={[styles.salesmanSub, { color: theme.colors.muted }]}>
                  {s.status} · {s.visits} visits · {timeAgo(s.lastActivityAt)}
                </Text>
              </View>

              <Text style={[styles.salesmanAmount, { color: theme.colors.accent }]}>
                {s.dealValue > 0 ? `+${formatINR(s.dealValue)}` : formatINR(0)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconBtn: {
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
  searchBarWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  searchInput: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
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
  segmentedBarWrapper: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 14,
    gap: 4,
  },
  barSegment: {
    borderRadius: 7,
  },
  card: {
    marginHorizontal: 12,
    marginTop: 16,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusSquare: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  statusLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  statusFraction: {
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  statusPercent: {
    width: 44,
    textAlign: 'right',
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  salesmenList: {
    gap: 16,
  },
  salesmanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  salesmanInfo: {
    flex: 1,
    gap: 2,
  },
  salesmanName: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  salesmanSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  salesmanAmount: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
});
