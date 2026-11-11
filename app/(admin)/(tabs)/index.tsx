import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { X, LogOut } from 'lucide-react-native';
import { useTheme } from '../../../src/theme';
import { TickRing, Button, Field, LoadingView, ErrorView } from '../../../src/components';
import { crmService } from '../../../src/services';
import type { AdminOverview } from '../../../src/types';
import { useAppStore } from '../../../src/store';

export default function AdminHomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { logout } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSalesmanName, setNewSalesmanName] = useState('');
  const [newSalesmanPhone, setNewSalesmanPhone] = useState('');

  const {
    data: overview,
    isLoading,
    error,
    refetch,
  } = useQuery<AdminOverview>({
    queryKey: ['admin-overview'],
    queryFn: () => crmService.getAdminOverview(),
  });

  if (isLoading) {
    return <LoadingView message="Loading manager dashboard..." />;
  }

  if (error || !overview) {
    return <ErrorView message="Could not load admin stats" onRetry={() => refetch()} />;
  }

  const handleAddSalesman = () => {
    if (!newSalesmanName) return;
    setShowAddModal(false);
    setNewSalesmanName('');
    setNewSalesmanPhone('');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topSection}>
        {/* Header date and Add salesman */}
        <View style={styles.topRow}>
          <Text style={[styles.dateText, { color: theme.colors.muted }]}>Tuesday, 10 Nov</Text>
          <View style={styles.topActions}>
            <Pressable
              onPress={() => setShowAddModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Add salesman"
              style={[styles.addBtn, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.addBtnText, { color: theme.colors.text }]}>+ Add salesman</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                logout();
                router.replace('/'); // '/' redirects to /login
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              style={[styles.iconBtn, { borderColor: theme.colors.border }]}
            >
              <LogOut size={16} color={theme.colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Welcome Manager heading */}
        <View style={styles.headingBlock}>
          <Text style={[styles.heading, { color: theme.colors.text }]}>
            Welcome in,{'\n'}Manager
          </Text>
          <Text style={[styles.salesmanCount, { color: theme.colors.muted }]}>12 salesmen</Text>
        </View>

        {/* 86 Visits Today Ring */}
        <View style={styles.ringWrapper}>
          <TickRing
            value={overview.visitsDone.toString()}
            label="Visits today"
            activeCount={overview.visitsDone}
            totalCount={overview.visitsTarget}
            size={240}
          />
        </View>
      </View>

      {/* Bottom Sheet Card */}
      <View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.sheet,
            borderTopRightRadius: theme.radius.sheet,
          },
        ]}
      >
        <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>Today&apos;s summary</Text>

        {/* 2 Tiles: Visits and Deals */}
        <View style={styles.metricsRow}>
          {/* Tile 1 */}
          <View style={[styles.metricTile, { backgroundColor: theme.colors.surface2 }]}>
            <Text style={[styles.metricNumber, { color: theme.colors.text }]}>
              {overview.visitsDone}
            </Text>
            <View style={styles.metricSubRow}>
              <Text style={[styles.metricSubText, { color: theme.colors.muted }]}>
                Visits of {overview.visitsTarget}
              </Text>
              <Text style={[styles.metricHighlight, { color: theme.colors.accent }]}>
                {Math.round((overview.visitsDone / overview.visitsTarget) * 100)}%
              </Text>
            </View>
          </View>

          {/* Tile 2 */}
          <View style={[styles.metricTile, { backgroundColor: theme.colors.surface2 }]}>
            <Text style={[styles.metricNumber, { color: theme.colors.text }]}>
              {overview.dealsClosed}
            </Text>
            <View style={styles.metricSubRow}>
              <Text style={[styles.metricSubText, { color: theme.colors.muted }]}>
                Deals closed
              </Text>
              <Text style={[styles.metricHighlight, { color: theme.colors.accent }]}>
                ₹{(overview.dealValueTotal / 100000).toFixed(1)}L
              </Text>
            </View>
          </View>
        </View>

        {/* Outcome pills */}
        <View style={styles.outcomesRow}>
          <View
            style={[
              styles.outcomePill,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.outcomeLabel, { color: theme.colors.text }]}>
              Interested{' '}
              <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
                {overview.outcomes.interested}
              </Text>
            </Text>
          </View>

          <View
            style={[
              styles.outcomePill,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.outcomeLabel, { color: theme.colors.text }]}>
              Closed{' '}
              <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
                {overview.outcomes.closed}
              </Text>
            </Text>
          </View>

          <View
            style={[
              styles.outcomePill,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.outcomeLabel, { color: theme.colors.text }]}>
              Not interested{' '}
              <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
                {overview.outcomes.notInterested}
              </Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Add Salesman Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Add new salesman
              </Text>
              <Pressable
                onPress={() => setShowAddModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={theme.colors.muted} />
              </Pressable>
            </View>

            <Field
              label="Full name"
              value={newSalesmanName}
              onChangeText={setNewSalesmanName}
              placeholder="e.g. Salesman E"
            />

            <Field
              label="Phone number"
              value={newSalesmanPhone}
              onChangeText={setNewSalesmanPhone}
              keyboardType="phone-pad"
              placeholder="+91 98000 00000"
            />

            <Button
              title="Add Salesman"
              onPress={handleAddSalesman}
              variant="primary"
              size="normal"
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
  },
  headingBlock: {
    paddingTop: 16,
    gap: 6,
  },
  heading: {
    fontFamily: 'Inter',
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 35,
  },
  salesmanCount: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  ringWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 10,
  },
  bottomSheet: {
    padding: 20,
    gap: 16,
    marginTop: 12,
  },
  sheetTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricTile: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  metricNumber: {
    fontFamily: 'Inter',
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 40,
  },
  metricSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricSubText: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  metricHighlight: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
  },
  outcomesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  outcomePill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  outcomeLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalBox: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
  },
});
