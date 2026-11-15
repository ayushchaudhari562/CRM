// Admin: one visit in detail + that salesman's visits on the same day. Data from the API.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Camera, MapPin, Mic, Paperclip, Store, X, Eye } from 'lucide-react-native';
import { useTheme, fonts } from '../../../src/theme';
import {
  Card,
  Chip,
  Timeline,
  LoadingView,
  ErrorView,
  VoicePlayer,
  type TimelineItem,
} from '../../../src/components';
import { crmService } from '../../../src/services';
import { formatDateTime, formatINR, formatTime } from '../../../src/utils/format';

const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

export default function AdminMeetingReportScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const meeting = useQuery({
    queryKey: ['admin-meeting', id],
    queryFn: () => crmService.getMeeting(id),
    enabled: !!id,
  });
  const salesmanId = meeting.data?.salesmanId;
  const dayVisits = useQuery({
    queryKey: ['admin-meetings', salesmanId],
    queryFn: () => crmService.getAllMeetings(100, salesmanId),
    enabled: !!salesmanId,
  });

  if (meeting.isLoading) return <LoadingView message="Loading report..." />;
  if (meeting.error || !meeting.data) {
    return (
      <ErrorView
        message={meeting.error?.message ?? 'Could not load report'}
        onRetry={() => meeting.refetch()}
      />
    );
  }
  const m = meeting.data;

  const timeline: TimelineItem[] = (dayVisits.data ?? [])
    .filter((v) => sameDay(v.checkInAt, m.checkInAt))
    .sort((a, b) => a.checkInAt.localeCompare(b.checkInAt))
    .map((v) => ({
      id: v.id,
      clientName: v.clientName,
      businessType: v.businessType,
      status: v.checkOutAt ? 'done' : 'in_progress',
      statusLabel: v.checkOutAt ? v.outcome : 'In meeting',
      time: formatTime(v.checkInAt),
      dealValue: v.outcome === 'Closed' ? v.dealValue : undefined,
    }));

  const muted = { color: theme.colors.muted };
  const text = { color: theme.colors.text };

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
        <View style={styles.flex1}>
          <Text style={[styles.salesman, text]}>{m.salesmanName}</Text>
          <Text style={[styles.small, muted]}>Field sales</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={[styles.title, text]}>Meeting report</Text>
          <Text style={[styles.small, muted]}>
            {m.clientName} · {m.businessType} · {formatDateTime(m.checkInAt)}
          </Text>
        </View>

        {/* Outcome + deal */}
        <Card style={styles.gap8}>
          <View style={styles.rowBetween}>
            <Text style={[styles.label, muted]}>Outcome</Text>
            <Text
              style={[
                styles.value,
                { color: m.outcome === 'Closed' ? theme.colors.accent : theme.colors.text },
              ]}
            >
              {m.outcome}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={[styles.label, muted]}>Deal value</Text>
            <Text style={[styles.value, text]}>{formatINR(m.dealValue)}</Text>
          </View>
          {m.products.length ? (
            <View style={styles.chips}>
              {m.products.map((p) => (
                <Chip key={p} label={p} />
              ))}
            </View>
          ) : null}
        </Card>

        {/* Visit proof */}
        <Card style={styles.gap8}>
          <Text style={[styles.cardTitle, text]}>Visit proof</Text>
          <ProofRow
            icon={<Store size={16} color={theme.colors.muted} />}
            text={`Shop address: ${m.clientAddress ?? 'not written'}`}
          />
          <ProofRow
            icon={<MapPin size={16} color={theme.colors.muted} />}
            text={
              m.location
                ? [
                    `Nearby (GPS): ${m.location.address ?? 'address not found'}`,
                    `GPS ${m.location.latitude.toFixed(5)}, ${m.location.longitude.toFixed(5)}`,
                  ].join('\n')
                : 'GPS not captured (permission denied)'
            }
          />
          {m.selfieUrl ? (
            <View style={styles.selfieBlock}>
              <View style={styles.iconRow}>
                <Camera size={16} color={theme.colors.accent} />
                <Text style={[styles.body, text]}>Check-in selfie</Text>
                <Text style={[styles.small, muted]}>· Tap to expand</Text>
              </View>
              <Pressable
                onPress={() => setSelectedImage(m.selfieUrl)}
                style={({ pressed }) => [
                  styles.selfieCard,
                  { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="View full size selfie"
              >
                <Image
                  source={{ uri: m.selfieUrl }}
                  style={styles.selfieImg}
                  resizeMode="cover"
                />
                <View style={styles.selfieOverlay}>
                  <Eye size={14} color="#FFFFFF" />
                  <Text style={styles.selfieOverlayText}>Tap to view full screen</Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <ProofRow
              icon={<Camera size={16} color={theme.colors.muted} />}
              text="No selfie captured"
            />
          )}
          <Text style={[styles.small, muted]}>
            Check-in {formatTime(m.checkInAt)}
            {m.checkOutAt ? ` · Check-out ${formatTime(m.checkOutAt)}` : ' · Still in meeting'}
          </Text>
        </Card>

        {/* Notes */}
        {m.note || m.aiSummary || m.voiceNoteUrl ? (
          <Card style={styles.gap8}>
            {m.note ? (
              <>
                <Text style={[styles.cardTitle, text]}>Note</Text>
                <Text style={[styles.body, text]}>{m.note}</Text>
              </>
            ) : null}
            {m.voiceNoteUrl || m.aiSummary ? (
              <>
                <View style={styles.iconRow}>
                  <Mic size={14} color={theme.colors.muted} />
                  <Text style={[styles.small, muted]}>
                    Voice note{m.voiceNoteDuration ? ` · ${m.voiceNoteDuration}s` : ''}
                    {m.aiSummary ? ' · AI summary' : ''}
                  </Text>
                </View>
                {m.voiceNoteUrl ? (
                  <VoicePlayer uri={m.voiceNoteUrl} seconds={m.voiceNoteDuration} />
                ) : null}
                {m.aiSummary ? <Text style={[styles.body, text]}>{m.aiSummary}</Text> : null}
              </>
            ) : null}
          </Card>
        ) : null}

        {/* Next visit + attachments */}
        <Card style={styles.gap8}>
          <View style={styles.rowBetween}>
            <Text style={[styles.label, muted]}>Next visit</Text>
            <Text style={[styles.value, text]}>
              {m.nextVisit ? formatDateTime(m.nextVisit) : 'Not planned'}
            </Text>
          </View>
          {m.nextVisit ? (
            <Text style={[styles.small, muted]}>
              {m.whatsappReminder ? 'WhatsApp reminder on' : 'No WhatsApp reminder'}
            </Text>
          ) : null}
          {m.attachments.length ? (
            <View style={styles.iconRow}>
              <Paperclip size={14} color={theme.colors.muted} />
              <Text style={[styles.small, muted]}>
                {m.attachments.map((a) => a.name).join(', ')}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Same-day timeline */}
        <Card style={styles.gap8}>
          <Text style={[styles.cardTitle, text]}>
            {m.salesmanName.split(' ')[0]}&apos;s visits that day ({timeline.length})
          </Text>
          {dayVisits.isLoading ? (
            <Text style={[styles.small, muted]}>Loading...</Text>
          ) : (
            <Timeline items={timeline} />
          )}
        </Card>
      </ScrollView>

      {/* Fullscreen Image Preview Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModalOverlay}>
          <Pressable
            style={styles.imageModalBackdrop}
            onPress={() => setSelectedImage(null)}
          />
          <Pressable
            style={styles.imageModalCloseBtn}
            onPress={() => setSelectedImage(null)}
            accessibilityRole="button"
            accessibilityLabel="Close image"
          >
            <X size={22} color="#FFFFFF" />
          </Pressable>
          {selectedImage ? (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function ProofRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.iconRow}>
      {icon}
      <Text style={[styles.body, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salesman: { fontFamily: fonts.medium, fontSize: 14 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  title: { fontFamily: fonts.semibold, fontSize: 30 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  label: { fontFamily: fonts.regular, fontSize: 13 },
  value: { fontFamily: fonts.semibold, fontSize: 15 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  small: { fontFamily: fonts.regular, fontSize: 12 },
  gap8: { gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selfieBlock: {
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  selfieCard: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  selfieImg: {
    width: '100%',
    height: '100%',
  },
  selfieOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  selfieOverlayText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageModalCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fullImage: {
    width: '94%',
    height: '80%',
  },
});
