import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Search,
  X,
  UserPlus,
  Trash2,
  Phone,
  Users,
  Activity,
  Plus,
} from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import { LoadingView, ErrorView, Button, Field } from '../../../src/components';
import { crmService } from '../../../src/services';
import type { FieldStatus, SalesmanProgress } from '../../../src/types';
import { formatINR, formatTime, initialOf, timeAgo } from '../../../src/utils/format';

export default function AdminLiveMonitoringScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'salesmen' | 'live'>('salesmen');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Add Salesman Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSalesmanName, setNewSalesmanName] = useState('');
  const [newSalesmanPhone, setNewSalesmanPhone] = useState('');
  const [addError, setAddError] = useState('');

  const {
    data: progressList,
    isLoading,
    error,
    refetch,
  } = useQuery<SalesmanProgress[]>({
    queryKey: ['admin-progress'],
    refetchInterval: 60_000,
    queryFn: () => crmService.getSalesmanProgress(),
  });

  const { data: todayVisits } = useQuery({
    queryKey: ['admin-today-visits'],
    refetchInterval: 60_000,
    queryFn: () => crmService.getTodayMeetings(),
  });

  // Add salesman mutation
  const addSalesmanMutation = useMutation({
    mutationFn: crmService.addSalesman,
    onSuccess: () => {
      setShowAddModal(false);
      setNewSalesmanName('');
      setNewSalesmanPhone('');
      setAddError('');
      qc.invalidateQueries({ queryKey: ['admin-progress'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (e: Error) => {
      setAddError(e.message || 'Could not add salesman. Please check the number.');
    },
  });

  // Deactivate / Delete salesman mutation
  const deactivateSalesmanMutation = useMutation({
    mutationFn: crmService.deactivateSalesman,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-progress'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      Alert.alert('Salesman Removed', 'The salesman has been removed from the active roster.');
    },
    onError: (e: Error) => {
      Alert.alert('Error', e.message || 'Could not remove salesman.');
    },
  });

  const handleAddSalesman = () => {
    if (!newSalesmanName.trim()) {
      setAddError('Enter the salesman full name.');
      return;
    }
    const digits = newSalesmanPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      setAddError('Enter a valid 10-digit mobile number.');
      return;
    }
    setAddError('');
    addSalesmanMutation.mutate({ name: newSalesmanName, phone: newSalesmanPhone });
  };

  const handleDeleteSalesman = (s: SalesmanProgress) => {
    Alert.alert(
      'Remove Salesman',
      `Are you sure you want to remove ${s.name}${s.phone ? ` (${s.phone})` : ''}?\n\nThey will be logged out of JTA CRM on all devices, but their past visits and history will remain safe.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deactivateSalesmanMutation.mutate(s.id),
        },
      ]
    );
  };

  const handleCallSalesman = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Cannot Call', `Could not open dialer for ${phone}`);
    });
  };

  if (isLoading) {
    return <LoadingView message="Loading salesman directory..." />;
  }

  if (error || !progressList) {
    return (
      <ErrorView
        message={error?.message ?? 'Could not load team data'}
        onRetry={() => refetch()}
      />
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const has = (...texts: (string | undefined | null)[]) =>
    !q || texts.some((t) => t && t.toLowerCase().includes(q));

  const allSalesmen = progressList.filter((s) => has(s.name, s.phone));
  const ON_DUTY: FieldStatus[] = ['In meeting', 'On the road'];
  const onDuty = progressList.filter((s) => ON_DUTY.includes(s.status) && has(s.name, s.phone));
  const visits = (todayVisits ?? []).filter((m) => has(m.salesmanName, m.clientName));

  const getStatusColor = (status: FieldStatus) => {
    switch (status) {
      case 'In meeting':
        return theme.colors.accent;
      case 'On the road':
        return '#3B82F6'; // Blue
      case 'Day ended':
        return theme.colors.muted;
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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

        <View style={styles.topActions}>
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
              <X size={18} color={theme.colors.text} />
            ) : (
              <Search size={18} color={theme.colors.text} />
            )}
          </Pressable>

          <Pressable
            onPress={() => setShowAddModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Add salesman"
            style={[styles.addSalesmanHeaderBtn, { backgroundColor: theme.colors.accent }]}
          >
            <UserPlus size={15} color={theme.colors.onAccent} />
            <Text style={[styles.addSalesmanHeaderBtnText, { color: theme.colors.onAccent }]}>
              + Add
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Search Input Bar */}
      {isSearching ? (
        <View style={styles.searchBarWrapper}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search salesman by name or phone..."
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

      {/* Heading Block */}
      <View style={styles.headingBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Sales Team</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {progressList.length} registered · {onDuty.length} on duty right now
        </Text>
      </View>

      {/* Section Switcher Tabs */}
      <View style={[styles.tabSwitcher, { backgroundColor: theme.colors.surface2 }]}>
        <Pressable
          onPress={() => setActiveTab('salesmen')}
          style={[
            styles.tabBtn,
            activeTab === 'salesmen' && [
              styles.tabBtnActive,
              { backgroundColor: theme.colors.surface },
            ],
          ]}
        >
          <Users
            size={16}
            color={activeTab === 'salesmen' ? theme.colors.accent : theme.colors.muted}
          />
          <Text
            style={[
              styles.tabBtnText,
              {
                color: activeTab === 'salesmen' ? theme.colors.text : theme.colors.muted,
                fontFamily: activeTab === 'salesmen' ? fonts.semibold : fonts.regular,
              },
            ]}
          >
            All Salesmen ({allSalesmen.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('live')}
          style={[
            styles.tabBtn,
            activeTab === 'live' && [
              styles.tabBtnActive,
              { backgroundColor: theme.colors.surface },
            ],
          ]}
        >
          <Activity
            size={16}
            color={activeTab === 'live' ? theme.colors.accent : theme.colors.muted}
          />
          <Text
            style={[
              styles.tabBtnText,
              {
                color: activeTab === 'live' ? theme.colors.text : theme.colors.muted,
                fontFamily: activeTab === 'live' ? fonts.semibold : fonts.regular,
              },
            ]}
          >
            Live Activity ({onDuty.length})
          </Text>
        </Pressable>
      </View>

      {/* TAB 1: ALL SALESMEN (VIEW + ADD + DELETE) */}
      {activeTab === 'salesmen' ? (
        <View style={styles.salesmenSection}>
          {allSalesmen.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                {searchQuery ? 'No matching salesman found' : 'No salesmen registered yet'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.colors.muted }]}>
                {searchQuery
                  ? 'Try searching with another name or phone number.'
                  : 'Tap the button below to add your first field salesman.'}
              </Text>
              {!searchQuery && (
                <View style={{ marginTop: 12 }}>
                  <Button
                    title="+ Add New Salesman"
                    onPress={() => setShowAddModal(true)}
                    variant="primary"
                    size="normal"
                  />
                </View>
              )}
            </View>
          ) : (
            allSalesmen.map((s) => {
              const statusColor = getStatusColor(s.status);
              return (
                <View
                  key={s.id}
                  style={[
                    styles.salesmanCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  {/* Left: Avatar + Details */}
                  <View style={styles.salesmanCardLeft}>
                    <View
                      style={[
                        styles.salesmanAvatar,
                        {
                          backgroundColor:
                            s.status === 'In meeting' || s.status === 'On the road'
                              ? theme.colors.accent + '25'
                              : theme.colors.surface2,
                          borderColor: statusColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.salesmanAvatarText,
                          {
                            color:
                              s.status === 'In meeting' || s.status === 'On the road'
                                ? theme.colors.accent
                                : theme.colors.text,
                          },
                        ]}
                      >
                        {s.initials}
                      </Text>
                    </View>

                    <View style={styles.salesmanMeta}>
                      <Text style={[styles.salesmanCardName, { color: theme.colors.text }]}>
                        {s.name}
                      </Text>

                      {s.phone ? (
                        <Text style={[styles.salesmanCardPhone, { color: theme.colors.muted }]}>
                          {s.phone}
                        </Text>
                      ) : null}

                      <View style={styles.statusPillRow}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusPillText, { color: statusColor }]}>
                          {s.status}
                        </Text>
                        <Text style={[styles.statsSep, { color: theme.colors.muted }]}>·</Text>
                        <Text style={[styles.statsText, { color: theme.colors.muted }]}>
                          {s.visits} {s.visits === 1 ? 'visit' : 'visits'} today
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Call & Delete Actions */}
                  <View style={styles.salesmanActions}>
                    {s.phone ? (
                      <Pressable
                        onPress={() => handleCallSalesman(s.phone)}
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${s.name}`}
                        style={({ pressed }) => [
                          styles.actionIconBtn,
                          {
                            backgroundColor: theme.colors.surface2,
                            borderColor: theme.colors.border,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Phone size={16} color={theme.colors.accent} />
                      </Pressable>
                    ) : null}

                    <Pressable
                      onPress={() => handleDeleteSalesman(s)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${s.name}`}
                      style={({ pressed }) => [
                        styles.actionIconBtn,
                        {
                          backgroundColor: '#EF444415',
                          borderColor: '#EF444440',
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : (
        /* TAB 2: LIVE ACTIVITY (PUNCHED IN + VISITS) */
        <View style={styles.liveSection}>
          {/* Punched in right now */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              On duty now ({onDuty.length})
            </Text>
            {onDuty.length ? (
              onDuty.map((s) => (
                <View key={s.id} style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusSquare,
                      {
                        backgroundColor:
                          s.status === 'In meeting' ? theme.colors.accent : '#3B82F6',
                      },
                    ]}
                  />
                  <Text style={[styles.statusLabel, { color: theme.colors.text }]}>{s.name}</Text>
                  <Text style={[styles.statusFraction, { color: theme.colors.muted }]}>
                    {s.status} · {timeAgo(s.lastActivityAt)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.salesmanSub, { color: theme.colors.muted }]}>
                No one is punched in right now.
              </Text>
            )}
          </View>

          {/* Today's visits: newest first */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Today&apos;s visits ({visits.length})
            </Text>
            <View style={styles.salesmenList}>
              {visits.length === 0 ? (
                <Text style={[styles.salesmanSub, { color: theme.colors.muted }]}>
                  No visits logged yet today.
                </Text>
              ) : null}
              {visits.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/admin/report/${m.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.clientName}, ${m.outcome}, by ${m.salesmanName}. Open report`}
                  style={({ pressed }) => [styles.salesmanItem, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <View style={[styles.avatarBox, { backgroundColor: theme.colors.text }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.bg }]}>
                      {initialOf(m.clientName)}
                    </Text>
                  </View>
                  <View style={styles.salesmanInfo}>
                    <Text
                      style={[styles.salesmanName, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {m.clientName}
                    </Text>
                    <Text
                      style={[styles.salesmanSub, { color: theme.colors.muted }]}
                      numberOfLines={1}
                    >
                      {m.outcome} · {m.salesmanName} · {formatTime(m.checkInAt)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.salesmanAmount,
                      { color: m.outcome === 'Closed' ? theme.colors.accent : theme.colors.muted },
                    ]}
                  >
                    {formatINR(m.dealValue)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Add Salesman Modal (Keyboard Avoidance Enabled) */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={() => {
              Keyboard.dismiss();
              setShowAddModal(false);
            }}
          />
          <View
            style={[
              styles.modalBox,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Add new salesman
                </Text>
                <Text style={[styles.modalSub, { color: theme.colors.muted }]}>
                  They can immediately login via WhatsApp OTP
                </Text>
              </View>
              <Pressable
                onPress={() => setShowAddModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={theme.colors.muted} />
              </Pressable>
            </View>

            <Field
              label="Full name *"
              value={newSalesmanName}
              onChangeText={setNewSalesmanName}
              placeholder="e.g. Rahul Sharma"
            />

            <Field
              label="Phone number *"
              value={newSalesmanPhone}
              onChangeText={setNewSalesmanPhone}
              keyboardType="phone-pad"
              placeholder="e.g. 98765 43210"
              maxLength={10}
            />

            {addError ? (
              <Text
                accessibilityRole="alert"
                style={{ color: theme.colors.adminRedText, fontFamily: fonts.regular, fontSize: 13 }}
              >
                {addError}
              </Text>
            ) : null}

            <View style={{ marginTop: 4 }}>
              <Button
                title="Add Salesman"
                loading={addSalesmanMutation.isPending}
                onPress={handleAddSalesman}
                variant="primary"
                size="normal"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSalesmanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  addSalesmanHeaderBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
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
    paddingTop: 12,
    gap: 4,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 28,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
  },
  salesmenSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  salesmanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  salesmanCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  salesmanAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salesmanAvatarText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  salesmanMeta: {
    flex: 1,
    gap: 2,
  },
  salesmanCardName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  salesmanCardPhone: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusPillText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  statsSep: {
    fontSize: 11,
  },
  statsText: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  salesmanActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  liveSection: {
    gap: 14,
    marginTop: 8,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusSquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  statusLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  statusFraction: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  salesmenList: {
    gap: 14,
  },
  salesmanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 38,
    height: 38,
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
    fontSize: 14,
  },
  salesmanSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  salesmanAmount: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalBackdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalBox: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    marginBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
  },
  modalSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
});
