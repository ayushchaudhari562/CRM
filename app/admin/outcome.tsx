import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme, fonts } from '../../src/theme';
import { LoadingView, ErrorView, EmptyView } from '../../src/components';
import { crmService } from '../../src/services';
import { formatINR, formatTime, initialOf } from '../../src/utils/format';
import type { MeetingOutcome } from '../../src/types';

const OUTCOMES: MeetingOutcome[] = ['Interested', 'Closed', 'Not interested'];

/** Today's visits with one outcome (from the manager home pills). Tap a visit for its full report. */
export default function OutcomeVisitsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const param = useLocalSearchParams<{ outcome?: string }>().outcome;
  const outcome = OUTCOMES.find((o) => o === param) ?? 'Interested';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-outcome', outcome],
    queryFn: () => crmService.getTodayMeetingsByOutcome(outcome),
    refetchInterval: 60_000,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
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
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>{outcome}</Text>
          <Text style={[styles.sub, { color: theme.colors.muted }]}>
            Today · {data ? `${data.length} visit${data.length === 1 ? '' : 's'}` : '...'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingView message="Loading visits..." />
      ) : error || !data ? (
        <ErrorView message={error?.message ?? 'Could not load visits'} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyView
          title={`No "${outcome}" visits today`}
          description="They will show here as salesmen save meetings."
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: m }) => (
            <Pressable
              onPress={() => router.push(`/admin/report/${m.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${m.clientName} by ${m.salesmanName}. Open report`}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.colors.surface, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: theme.colors.text }]}>
                <Text style={[styles.avatarText, { color: theme.colors.bg }]}>
                  {initialOf(m.clientName)}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                  {m.clientName}
                </Text>
                <Text style={[styles.sub, { color: theme.colors.muted }]} numberOfLines={1}>
                  {m.businessType} · {m.salesmanName}
                </Text>
                <Text style={[styles.sub, { color: theme.colors.muted }]} numberOfLines={1}>
                  {formatTime(m.checkInAt)}
                  {m.dealValue > 0 ? ` · ${formatINR(m.dealValue)}` : ''}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.muted} />
            </Pressable>
          )}
        />
      )}
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
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 24,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
