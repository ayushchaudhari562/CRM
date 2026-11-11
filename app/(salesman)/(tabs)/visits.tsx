import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import { Chip, LoadingView, EmptyView, ErrorView } from '../../../src/components';
import { crmService } from '../../../src/services';
import { formatDateTime, formatINR } from '../../../src/utils/format';

const RANGE = { Today: 'today', Week: 'week', All: 'all' } as const;

export default function VisitsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<keyof typeof RANGE>('Today');

  // The server filters by date range and by the logged-in salesman.
  const {
    data: filtered = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['meetings', RANGE[filter]],
    queryFn: () => crmService.getMeetings(RANGE[filter]),
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Visits</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Review logged meetings and outcomes
        </Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <Chip label="Today" selected={filter === 'Today'} onPress={() => setFilter('Today')} />
        <Chip label="This Week" selected={filter === 'Week'} onPress={() => setFilter('Week')} />
        <Chip label="All Visits" selected={filter === 'All'} onPress={() => setFilter('All')} />
      </View>

      {/* Content */}
      {isLoading ? (
        <LoadingView message="Loading your visit logs..." />
      ) : error ? (
        <ErrorView message={error.message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyView
          title="No visits logged"
          description="You haven't logged any visits for this period yet."
          actionTitle="Start new meeting"
          onAction={() => router.push('/(salesman)/checkin')}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isClosed = item.outcome === 'Closed';
            const isInterested = item.outcome === 'Interested';

            return (
              <Pressable
                onPress={() => router.push(`/(salesman)/client/${item.clientId}`)}
                accessibilityRole="button"
                accessibilityLabel={`${item.clientName}, ${item.outcome}. Open client details`}
                style={({ pressed }) => [
                  styles.visitCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.clientName, { color: theme.colors.text }]}>
                      {item.clientName}
                    </Text>
                    <Text style={[styles.businessType, { color: theme.colors.muted }]}>
                      {item.businessType}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.outcomeBadge,
                      {
                        backgroundColor: isClosed
                          ? theme.colors.accentSoftBg
                          : isInterested
                            ? theme.colors.surface2
                            : theme.colors.surface2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.outcomeText,
                        {
                          color: isClosed
                            ? theme.colors.accent
                            : isInterested
                              ? theme.colors.text
                              : theme.colors.muted,
                        },
                      ]}
                    >
                      {item.outcome}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.footerItem}>
                    <Clock size={13} color={theme.colors.muted} />
                    <Text style={[styles.footerText, { color: theme.colors.muted }]}>
                      {formatDateTime(item.checkInAt)}
                    </Text>
                  </View>

                  {item.dealValue > 0 ? (
                    <Text style={[styles.dealValueText, { color: theme.colors.accent }]}>
                      {formatINR(item.dealValue)}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 26,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  visitCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  businessType: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  outcomeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  outcomeText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#202225',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  dealValueText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
});
