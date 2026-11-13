import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import {
  MapPin,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Phone,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, fonts } from '../theme';
import { Card } from './Card';
import { Button } from './Button';
import { Field } from './Field';
import { crmService } from '../services';
import type { PlannedStop, PlannedStopStatus } from '../types';

interface StopDraft {
  clientName: string;
  location: string;
  contactNumber: string;
}

function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNext7Days(): { label: string; dateStr: string; isToday: boolean }[] {
  const days: { label: string; dateStr: string; isToday: boolean }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dateStr = formatDateStr(d);
    let label = '';
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else {
      label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    }
    days.push({ label, dateStr, isToday: i === 0 });
  }
  return days;
}

export function WeeklyRoutePlanCard() {
  const { theme } = useTheme();
  const qc = useQueryClient();
  const days = getNext7Days();
  const [selectedDate, setSelectedDate] = useState<string>(days[0].dateStr);
  const [modalOpen, setModalOpen] = useState(false);
  const [clientCountInput, setClientCountInput] = useState('3');
  const [stopsDraft, setStopsDraft] = useState<StopDraft[]>([
    { clientName: '', location: '', contactNumber: '' },
    { clientName: '', location: '', contactNumber: '' },
    { clientName: '', location: '', contactNumber: '' },
  ]);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['weekly-plan', selectedDate],
    queryFn: () => crmService.getWeeklyPlan(selectedDate),
  });

  const saveMutation = useMutation({
    mutationFn: (input: { date: string; stops: { clientName: string; location: string; contactNumber?: string | null }[] }) =>
      crmService.setWeeklyPlan(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-plan'] });
      setModalOpen(false);
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Could not save route plan');
    },
  });

  const openPlanner = () => {
    if (plan && plan.stops.length > 0) {
      setStopsDraft(
        plan.stops.map((s) => ({
          clientName: s.clientName,
          location: s.location,
          contactNumber: s.contactNumber || '',
        })),
      );
      setClientCountInput(String(plan.stops.length));
    } else {
      setStopsDraft([
        { clientName: '', location: '', contactNumber: '' },
        { clientName: '', location: '', contactNumber: '' },
        { clientName: '', location: '', contactNumber: '' },
      ]);
      setClientCountInput('3');
    }
    setModalOpen(true);
  };

  const handleClientCountChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setClientCountInput(cleaned);
    const count = parseInt(cleaned, 10);
    if (!isNaN(count) && count >= 1 && count <= 20) {
      setStopsDraft((prev) => {
        if (count > prev.length) {
          const added = Array.from({ length: count - prev.length }, () => ({
            clientName: '',
            location: '',
            contactNumber: '',
          }));
          return [...prev, ...added];
        } else if (count < prev.length) {
          return prev.slice(0, count);
        }
        return prev;
      });
    }
  };

  const updateStopDraft = (idx: number, field: keyof StopDraft, value: string) => {
    setStopsDraft((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const addStopRow = () => {
    setStopsDraft((prev) => [...prev, { clientName: '', location: '', contactNumber: '' }]);
    setClientCountInput(String(stopsDraft.length + 1));
  };

  const removeStopRow = (idx: number) => {
    if (stopsDraft.length <= 1) return;
    setStopsDraft((prev) => prev.filter((_, i) => i !== idx));
    setClientCountInput(String(stopsDraft.length - 1));
  };

  const handleSave = () => {
    // Validate: each stop must have clientName and location
    for (let i = 0; i < stopsDraft.length; i++) {
      const s = stopsDraft[i];
      if (!s.clientName.trim()) {
        Alert.alert('Required', `Please enter Client Name for Stop #${i + 1}`);
        return;
      }
      if (!s.location.trim()) {
        Alert.alert('Required', `Please enter Location for Stop #${i + 1}`);
        return;
      }
    }

    const payload = stopsDraft.map((s) => ({
      clientName: s.clientName.trim(),
      location: s.location.trim(),
      contactNumber: s.contactNumber.trim() ? s.contactNumber.trim() : null,
    }));

    saveMutation.mutate({
      date: selectedDate,
      stops: payload,
    });
  };

  const stops = plan?.stops || [];
  const visitedCount = stops.filter((s) => s.status === 'VISITED').length;
  const totalCount = stops.length;

  return (
    <Card surface="surface" style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleWithIcon}>
            <Calendar size={18} color={theme.colors.accent} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Weekly Route Plan</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            Schedule visits & verify locations
          </Text>
        </View>

        <Button
          title={totalCount > 0 ? 'Edit Plan' : '+ Set Plan'}
          onPress={openPlanner}
          variant={totalCount > 0 ? 'outline' : 'primary'}
          size="compact"
        />
      </View>

      {/* 7-Day Horizontal Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayList}
      >
        {days.map((d) => {
          const isSelected = d.dateStr === selectedDate;
          return (
            <Pressable
              key={d.dateStr}
              onPress={() => setSelectedDate(d.dateStr)}
              style={[
                styles.dayChip,
                {
                  backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface2,
                  borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayChipText,
                  { color: isSelected ? theme.colors.onAccent : theme.colors.text },
                ]}
              >
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Plan content for the selected date */}
      {isLoading ? (
        <Text style={[styles.emptyText, { color: theme.colors.muted }]}>Loading route...</Text>
      ) : totalCount === 0 ? (
        <View style={[styles.emptyBox, { borderColor: theme.colors.border }]}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No stops planned for this date
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.muted }]}>
            Tap &quot;+ Set Plan&quot; to enter the clients and locations you plan to visit.
          </Text>
        </View>
      ) : (
        <View style={styles.stopsList}>
          {/* Progress Header */}
          <View style={styles.progressHeader}>
            <Text style={[styles.progressText, { color: theme.colors.muted }]}>
              Planned Stops: {visitedCount} of {totalCount} completed
            </Text>
            {visitedCount < totalCount && (
              <Text style={[styles.nightAlertNote, { color: theme.colors.accent }]}>
                Night 10 PM check active
              </Text>
            )}
          </View>

          {stops.map((stop, idx) => (
            <StopItem key={stop.id || idx} stop={stop} index={idx + 1} />
          ))}
        </View>
      )}

      {/* Plan Entry / Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Route Plan: {selectedDate}
                </Text>
                <Text style={[styles.modalSub, { color: theme.colors.muted }]}>
                  Select count and fill client details
                </Text>
              </View>
              <Pressable
                onPress={() => setModalOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={theme.colors.muted} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Number of Clients Input */}
              <View style={styles.countRow}>
                <Field
                  label="Number of Clients (Stops)"
                  placeholder="e.g. 3"
                  value={clientCountInput}
                  onChangeText={handleClientCountChange}
                  keyboardType="number-pad"
                  maxLength={2}
                  containerStyle={{ flex: 1 }}
                />
              </View>

              {/* Stop forms list */}
              {stopsDraft.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.stopDraftCard,
                    { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.stopDraftHeader}>
                    <Text style={[styles.stopDraftTitle, { color: theme.colors.accent }]}>
                      Client Stop #{idx + 1}
                    </Text>
                    {stopsDraft.length > 1 && (
                      <Pressable
                        onPress={() => removeStopRow(idx)}
                        style={styles.trashBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Delete stop"
                      >
                        <Trash2 size={16} color={theme.colors.adminRedText} />
                      </Pressable>
                    )}
                  </View>

                  <Field
                    label="Client / Shop Name *"
                    placeholder="e.g. Sharma Kirana"
                    value={item.clientName}
                    onChangeText={(t) => updateStopDraft(idx, 'clientName', t)}
                  />

                  <Field
                    label="Planned Location / Area *"
                    placeholder="e.g. Civil Lines, Kanpur"
                    value={item.location}
                    onChangeText={(t) => updateStopDraft(idx, 'location', t)}
                  />

                  <Field
                    label="Phone Number (Optional)"
                    placeholder="e.g. 9876543210"
                    value={item.contactNumber}
                    onChangeText={(t) => updateStopDraft(idx, 'contactNumber', t)}
                    keyboardType="phone-pad"
                  />
                </View>
              ))}

              <View style={{ marginTop: 8, marginBottom: 20 }}>
                <Button
                  title="+ Add Another Client Stop"
                  onPress={addStopRow}
                  variant="outline"
                  size="compact"
                  icon={<Plus size={16} color={theme.colors.text} />}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  onPress={() => setModalOpen(false)}
                  variant="outline"
                  size="normal"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Save Route"
                  onPress={handleSave}
                  loading={saveMutation.isPending}
                  variant="primary"
                  size="normal"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

function StopItem({ stop, index }: { stop: PlannedStop; index: number }) {
  const { theme } = useTheme();

  const isVisited = stop.status === 'VISITED';
  const isMissed = stop.status === 'MISSED';

  return (
    <View
      style={[
        styles.stopItem,
        {
          backgroundColor: theme.colors.surface2,
          borderColor: isVisited
            ? theme.colors.accent
            : isMissed
              ? theme.colors.adminRedText
              : theme.colors.border,
        },
      ]}
    >
      <View style={styles.stopIndexCol}>
        <View
          style={[
            styles.indexBadge,
            {
              backgroundColor: isVisited
                ? theme.colors.accent
                : isMissed
                  ? theme.colors.adminRed
                  : theme.colors.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.indexBadgeText,
              { color: isVisited ? theme.colors.onAccent : theme.colors.text },
            ]}
          >
            {index}
          </Text>
        </View>
      </View>

      <View style={styles.stopDetails}>
        <View style={styles.stopHeaderRow}>
          <Text style={[styles.stopClientName, { color: theme.colors.text }]}>
            {stop.clientName}
          </Text>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isVisited
                  ? theme.colors.accentSoftBg
                  : theme.colors.surface,
              },
            ]}
          >
            {isVisited ? (
              <CheckCircle2 size={12} color={theme.colors.accent} />
            ) : isMissed ? (
              <AlertCircle size={12} color={theme.colors.adminRedText} />
            ) : (
              <Clock size={12} color={theme.colors.muted} />
            )}
            <Text
              style={[
                styles.statusPillText,
                {
                  color: isVisited
                    ? theme.colors.accent
                    : isMissed
                      ? theme.colors.adminRedText
                      : theme.colors.muted,
                },
              ]}
            >
              {stop.status}
            </Text>
          </View>
        </View>

        <View style={styles.stopLocationRow}>
          <MapPin size={13} color={theme.colors.muted} />
          <Text style={[styles.stopLocationText, { color: theme.colors.muted }]} numberOfLines={1}>
            {stop.location}
          </Text>
        </View>

        {stop.contactNumber ? (
          <View style={styles.stopPhoneRow}>
            <Phone size={12} color={theme.colors.muted} />
            <Text style={[styles.stopPhoneText, { color: theme.colors.muted }]}>
              {stop.contactNumber}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  dayList: {
    gap: 8,
    paddingVertical: 4,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayChipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    paddingVertical: 8,
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  emptyDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
  },
  stopsList: {
    gap: 10,
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  progressText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  nightAlertNote: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  stopIndexCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  stopDetails: {
    flex: 1,
    gap: 4,
  },
  stopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopClientName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  stopLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stopLocationText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    flex: 1,
  },
  stopPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stopPhoneText: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 450,
  },
  countRow: {
    marginBottom: 12,
  },
  stopDraftCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  stopDraftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopDraftTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  trashBtn: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
