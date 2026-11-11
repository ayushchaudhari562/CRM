import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { useTheme } from '../../../src/theme';
import { LoadingView, ErrorView } from '../../../src/components';
import { crmService } from '../../../src/services';
import type { SalesmanProgress } from '../../../src/types';

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
    queryKey: ['salesman-progress'],
    queryFn: () => crmService.getSalesmanProgress(),
  });

  if (isLoading) {
    return <LoadingView message="Loading live salesman tracking..." />;
  }

  if (error || !progressList) {
    return (
      <ErrorView
        message="Could not load live monitoring details"
        onRetry={() => refetch()}
      />
    );
  }

  const filteredSalesmen = progressList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
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
          12 salesmen · updated just now
        </Text>
      </View>

      {/* Segmented Status Bar */}
      <View style={styles.segmentedBarWrapper}>
        <View style={styles.segmentedBar}>
          <View style={[styles.barSegment, { flex: 5, backgroundColor: theme.colors.accent }]} />
          <View style={[styles.barSegment, { flex: 4, backgroundColor: theme.colors.text }]} />
          <View style={[styles.barSegment, { flex: 3, backgroundColor: '#8C7B65' }]} />
        </View>
      </View>

      {/* Field status card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Field status</Text>

        <View style={styles.statusRow}>
          <View style={[styles.statusSquare, { backgroundColor: theme.colors.accent }]} />
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>In meeting</Text>
          <Text style={[styles.statusFraction, { color: theme.colors.muted }]}>5/12</Text>
          <Text style={[styles.statusPercent, { color: theme.colors.text }]}>42%</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusSquare, { backgroundColor: theme.colors.text }]} />
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>On the road</Text>
          <Text style={[styles.statusFraction, { color: theme.colors.muted }]}>4/12</Text>
          <Text style={[styles.statusPercent, { color: theme.colors.text }]}>33%</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusSquare, { backgroundColor: '#8C7B65' }]} />
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>Not started</Text>
          <Text style={[styles.statusFraction, { color: theme.colors.muted }]}>3/12</Text>
          <Text style={[styles.statusPercent, { color: theme.colors.text }]}>25%</Text>
        </View>
      </View>

      {/* Today&apos;s progress card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Today&apos;s progress</Text>

        <View style={styles.salesmenList}>
          {filteredSalesmen.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/(admin)/report/m-3`)}
              style={({ pressed }) => [
                styles.salesmanItem,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View
                style={[
                  styles.avatarBox,
                  { backgroundColor: theme.colors.text },
                ]}
              >
                <Text style={[styles.avatarText, { color: theme.colors.bg }]}>
                  {s.initials}
                </Text>
              </View>

              <View style={styles.salesmanInfo}>
                <Text style={[styles.salesmanName, { color: theme.colors.text }]}>
                  {s.name}
                </Text>
                <Text style={[styles.salesmanSub, { color: theme.colors.muted }]}>
                  {s.visits} visits · {s.lastUpdated}
                </Text>
              </View>

              <Text style={[styles.salesmanAmount, { color: theme.colors.accent }]}>
                {s.dealValue > 0 ? `+₹${s.dealValue.toLocaleString('en-IN')}` : '₹0'}
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: 14,
  },
  headingBlock: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 4,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 30,
    fontWeight: '600',
  },
  subtitle: {
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
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
    fontFamily: 'Inter',
    fontSize: 15,
  },
  statusFraction: {
    fontFamily: 'Inter',
    fontSize: 15,
  },
  statusPercent: {
    width: 44,
    textAlign: 'right',
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
  },
  salesmanInfo: {
    flex: 1,
    gap: 2,
  },
  salesmanName: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
  },
  salesmanSub: {
    fontFamily: 'Inter',
    fontSize: 12,
  },
  salesmanAmount: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
  },
});

