// Client profile + visit history for the salesman. Data from GET /me/clients/:id (own clients only).
// Editing rules live in src/config.ts (SALESMAN_EDITABLE). Right now every group is locked -> view-only.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Lock, MapPin, Mic, Paperclip, Phone, Store, Camera } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import {
  Card,
  Chip,
  LoadingView,
  ErrorView,
  EmptyView,
  VoicePlayer,
} from '../../../src/components';
import { crmService } from '../../../src/services';
import { formatDateTime, formatINR, initialOf } from '../../../src/utils/format';
import type { FollowUp, Meeting } from '../../../src/types';
import { SALESMAN_EDITABLE } from '../../../src/config';

const NOTHING_EDITABLE = !Object.values(SALESMAN_EDITABLE).some(Boolean);

export default function ClientDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: client,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['client', id],
    queryFn: () => crmService.getClient(id),
    enabled: !!id,
  });

  if (isLoading) return <LoadingView message="Loading client..." />;
  if (error || !client)
    return (
      <ErrorView message={error?.message ?? 'Could not load client'} onRetry={() => refetch()} />
    );

  const pending = client.followUps.filter((f) => f.status === 'Pending' || f.status === 'Overdue');

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backBtn, { backgroundColor: theme.colors.surface }]}
        >
          <ChevronLeft size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Client details</Text>
      </View>

      {/* Profile */}
      <Card style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.text }]}>
          <Text style={[styles.avatarText, { color: theme.colors.bg }]}>
            {initialOf(client.name)}
          </Text>
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{client.name}</Text>
          <Text style={[styles.muted, { color: theme.colors.muted }]}>{client.businessType}</Text>
        </View>
        {NOTHING_EDITABLE ? <LockedBadge /> : null}
      </Card>

      <Card style={styles.infoCard}>
        <InfoRow
          icon={<Phone size={16} color={theme.colors.muted} />}
          label="Contact"
          value={client.contactNumber ?? 'Not added'}
        />
        <InfoRow
          icon={<Store size={16} color={theme.colors.muted} />}
          label="Shop"
          value={client.address ?? 'Not written'}
        />
        <InfoRow
          icon={<MapPin size={16} color={theme.colors.muted} />}
          label="GPS"
          value={
            client.meetings.find((m) => m.location?.address)?.location?.address ?? 'Not captured'
          }
        />
      </Card>

      {/* Follow-ups */}
      <Text style={[styles.section, { color: theme.colors.text }]}>Upcoming follow-ups</Text>
      {pending.length ? (
        pending.map((f) => <FollowUpRow key={f.id} f={f} />)
      ) : (
        <Text style={[styles.muted, { color: theme.colors.muted }]}>No pending follow-ups</Text>
      )}

      {/* Visit history */}
      <Text style={[styles.section, { color: theme.colors.text }]}>
        Visit history ({client.meetings.length})
      </Text>
      {client.meetings.length ? (
        client.meetings.map((m) => <VisitCard key={m.id} m={m} />)
      ) : (
        <EmptyView title="No visits yet" description="Visits with this client will show here." />
      )}
    </ScrollView>
  );
}

function LockedBadge() {
  const { theme } = useTheme();
  return (
    <View
      style={[styles.lockBadge, { backgroundColor: theme.colors.surface2 }]}
      accessibilityLabel="View only"
    >
      <Lock size={12} color={theme.colors.muted} />
      <Text style={[styles.lockText, { color: theme.colors.muted }]}>View only</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoRow}>
      {icon}
      <Text style={[styles.infoLabel, { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function FollowUpRow({ f }: { f: FollowUp }) {
  const { theme } = useTheme();
  const overdue = f.status === 'Overdue';
  return (
    <View style={[styles.followUp, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.body, { color: theme.colors.text }]}>
        {f.type} · {formatDateTime(f.dueAt)}
      </Text>
      <Text
        style={[
          styles.statusText,
          { color: overdue ? theme.colors.adminRedText : theme.colors.accent },
        ]}
      >
        {f.status}
      </Text>
    </View>
  );
}

function VisitCard({ m }: { m: Meeting }) {
  const { theme } = useTheme();
  const outcomeColor =
    m.outcome === 'Closed'
      ? theme.colors.accent
      : m.outcome === 'Interested'
        ? theme.colors.text
        : theme.colors.muted;
  return (
    <Card style={styles.visit}>
      <View style={styles.visitTop}>
        <Text style={[styles.visitDate, { color: theme.colors.text }]}>
          {formatDateTime(m.checkInAt)}
        </Text>
        <Text style={[styles.statusText, { color: outcomeColor }]}>{m.outcome}</Text>
      </View>

      {m.dealValue > 0 ? (
        <Text style={[styles.deal, { color: theme.colors.accent }]}>{formatINR(m.dealValue)}</Text>
      ) : null}

      {m.products.length ? (
        <View style={styles.chips}>
          {m.products.map((p) => (
            <Chip key={p} label={p} />
          ))}
        </View>
      ) : null}

      {m.note ? <Text style={[styles.body, { color: theme.colors.text }]}>{m.note}</Text> : null}

      {m.voiceNoteUrl || m.aiSummary ? (
        <View style={[styles.summary, { backgroundColor: theme.colors.surface2 }]}>
          <View style={styles.iconRow}>
            <Mic size={14} color={theme.colors.muted} />
            <Text style={[styles.small, { color: theme.colors.muted }]}>
              Voice note{m.voiceNoteDuration ? ` · ${m.voiceNoteDuration}s` : ''}
              {m.aiSummary ? ' · AI summary' : ''}
            </Text>
          </View>
          {m.voiceNoteUrl ? (
            <VoicePlayer uri={m.voiceNoteUrl} seconds={m.voiceNoteDuration} />
          ) : null}
          {m.aiSummary ? (
            <Text style={[styles.body, { color: theme.colors.text }]}>{m.aiSummary}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.meta}>
        <Text style={[styles.small, { color: theme.colors.muted }]}>
          {m.location ? `GPS: ${m.location.address ?? 'captured'}` : 'GPS not captured'}
          {m.nextVisit ? ` · Next visit ${formatDateTime(m.nextVisit)}` : ''}
        </Text>
        {m.selfieUrl ? (
          <View style={styles.iconRow}>
            <Camera size={12} color={theme.colors.accent} />
            <Text style={[styles.small, { color: theme.colors.accent }]}>Selfie</Text>
          </View>
        ) : null}
        {m.attachments.length ? (
          <View style={styles.iconRow}>
            <Paperclip size={12} color={theme.colors.muted} />
            <Text style={[styles.small, { color: theme.colors.muted }]}>
              {m.attachments.length}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  flex1: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.semibold, fontSize: 18 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 20 },
  name: { fontFamily: fonts.semibold, fontSize: 18 },
  muted: { fontFamily: fonts.regular, fontSize: 13 },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  lockText: { fontFamily: fonts.medium, fontSize: 12 },
  infoCard: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontFamily: fonts.regular, fontSize: 13, width: 64 },
  infoValue: { fontFamily: fonts.regular, fontSize: 15, flex: 1 },
  section: { fontFamily: fonts.semibold, fontSize: 16, marginTop: 12 },
  followUp: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  visit: { gap: 10 },
  visitTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visitDate: { fontFamily: fonts.semibold, fontSize: 15 },
  statusText: { fontFamily: fonts.medium, fontSize: 13 },
  deal: { fontFamily: fonts.semibold, fontSize: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  summary: { padding: 12, borderRadius: 14, gap: 6 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  small: { fontFamily: fonts.regular, fontSize: 12 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
