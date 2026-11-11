import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react-native';
import { useTheme } from '../../../src/theme';
import { Chip, LoadingView, EmptyView, ErrorView } from '../../../src/components';
import { crmService } from '../../../src/services';
import { useAppStore } from '../../../src/store';
import type { Meeting } from '../../../src/types';

export default function VisitsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAppStore();
  const [filter, setFilter] = useState<'Today' | 'Week' | 'All'>('Today');

  const {
    data: meetings,
    isLoading,
    error,
    refetch,
  } = useQuery<Meeting[]>({
    queryKey: ['meetings', user.id],
    queryFn: () => crmService.getMeetings(user.id),
  });

  const getFilteredMeetings = () => {
    if (!meetings) return [];
    if (filter === 'Today') {
      return meetings.slice(0, 3);
    }
    if (filter === 'Week') {
      return meetings;
    }
    return meetings;
  };

  const filtered = getFilteredMeetings();

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
        <Chip
          label="Today"
          selected={filter === 'Today'}
          onPress={() => setFilter('Today')}
        />
        <Chip
          label="This Week"
          selected={filter === 'Week'}
          onPress={() => setFilter('Week')}
        />
        <Chip
          label="All Visits"
          selected={filter === 'All'}
          onPress={() => setFilter('All')}
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <LoadingView message="Loading your visit logs..." />
      ) : error ? (
        <ErrorView message="Failed to load visits" onRetry={() => refetch()} />
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
              // Not tappable yet: the salesman visit detail screen comes in step 6.
              // (Before, this opened the ADMIN report, which the role guard now blocks.)
              <View
                style={[
                  styles.visitCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
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
                          ? '#1F3A27'
                          : isInterested
                          ? theme.colors.surface2
                          : '#2A2022',
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
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  {item.dealValue > 0 ? (
                    <Text style={[styles.dealValueText, { color: theme.colors.accent }]}>
                      ₹{item.dealValue.toLocaleString('en-IN')}
                    </Text>
                  ) : null}

                </View>
              </View>
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
    fontFamily: 'Inter',
    fontSize: 26,
    fontWeight: '600',
  },
  subtitle: {
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
  },
  businessType: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  outcomeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  outcomeText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
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
    fontFamily: 'Inter',
    fontSize: 12,
  },
  dealValueText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
  },
});

