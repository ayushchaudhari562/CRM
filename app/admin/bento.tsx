import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { MapPin, Search, X } from 'lucide-react-native';
import { useTheme, fonts } from '../../src/theme';
import { Button, Field, LoadingView, ErrorView, VoicePlayer } from '../../src/components';
import { APP_NAME } from '../../src/config';
import { crmService } from '../../src/services';
import { formatDay, formatINR, formatINRShort, timeAgo } from '../../src/utils/format';
import { useAppStore } from '../../src/store';

export default function AdminWebBentoScreen() {
  const { theme, setThemeVariant } = useTheme();
  const { user } = useAppStore();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [activeNav, setActiveNav] = useState<'Overview' | 'Team' | 'Map' | 'Reports'>('Overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSalesmanName, setNewSalesmanName] = useState('');
  const [newSalesmanPhone, setNewSalesmanPhone] = useState('');
  const [addError, setAddError] = useState('');

  const qc = useQueryClient();
  const overviewQ = useQuery({
    queryKey: ['admin-overview'],
    queryFn: crmService.getAdminOverview,
    refetchInterval: 60_000,
  });
  const progressQ = useQuery({
    queryKey: ['admin-progress'],
    queryFn: crmService.getSalesmanProgress,
    refetchInterval: 60_000,
  });
  const recentQ = useQuery({
    queryKey: ['admin-meetings'],
    queryFn: () => crmService.getAllMeetings(50),
  });
  const addSalesman = useMutation({
    mutationFn: crmService.addSalesman,
    onSuccess: () => {
      setShowAddModal(false);
      setNewSalesmanName('');
      setNewSalesmanPhone('');
      setAddError('');
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      qc.invalidateQueries({ queryKey: ['admin-progress'] });
    },
    onError: (e) => setAddError(e.message),
  });

  // Switch theme to red on mount/active
  React.useEffect(() => {
    setThemeVariant('red');
  }, [setThemeVariant]);

  // Determine responsive columns: 4 cols (wide > 960px), 2 cols (tablet 640-960px), 1 col (phone < 640px)
  const isWide = width >= 960;
  const isTablet = width >= 640 && width < 960;
  const isPhone = width < 640;

  const gap = 16;

  const handleNavPress = (tab: 'Overview' | 'Team' | 'Map' | 'Reports') => {
    setActiveNav(tab);
    if (tab === 'Team') router.push('/admin/monitoring');
    else if (tab === 'Map') router.push('/admin/map');
    else if (tab === 'Reports') router.push('/admin/reports');
  };

  if (overviewQ.isLoading || progressQ.isLoading)
    return <LoadingView message="Loading dashboard..." />;
  const o = overviewQ.data;
  const progress = progressQ.data;
  if (!o || !progress) {
    const err = overviewQ.error ?? progressQ.error;
    return (
      <ErrorView
        message={err?.message ?? 'Could not load dashboard'}
        onRetry={() => {
          overviewQ.refetch();
          progressQ.refetch();
        }}
      />
    );
  }
  const targetPct = o.visitsTarget
    ? Math.min(100, Math.round((o.visitsDone / o.visitsTarget) * 100))
    : 0;
  const maxOutcome = Math.max(
    1,
    o.outcomes.interested,
    o.outcomes.closed,
    o.outcomes.notInterested,
  );
  const barPct = (n: number) => `${Math.round((n / maxOutcome) * 100)}%` as const;
  const onField = o.fieldStatus.inMeeting + o.fieldStatus.onRoad;
  const latestVoice = recentQ.data?.find((m) => m.aiSummary);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.mainWrapper, { maxWidth: 1200 }]}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          {/* Logo + App Name */}
          <View style={styles.brandRow}>
            <View style={[styles.logoBadge, { backgroundColor: theme.colors.adminRed }]}>
              <MapPin size={22} color="#FFFFFF" />
            </View>
            <Text style={[styles.brandText, { color: theme.colors.text }]}>{APP_NAME} Admin</Text>
          </View>

          {/* Navigation Pills */}
          <View
            style={[
              styles.navPills,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            {(['Overview', 'Team', 'Map', 'Reports'] as const).map((item) => {
              const isSelected = activeNav === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => handleNavPress(item)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={item}
                  style={[styles.navItem, isSelected && { backgroundColor: theme.colors.adminRed }]}
                >
                  <Text
                    style={[styles.navText, { color: isSelected ? '#FFFFFF' : theme.colors.text }]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Search + Add Salesman */}
          <View style={styles.rightActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              style={[styles.iconBtn, { borderColor: theme.colors.border }]}
            >
              <Search size={20} color={theme.colors.text} />
            </Pressable>

            <Pressable
              onPress={() => setShowAddModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Add salesman"
              style={[styles.addSalesmanBtn, { backgroundColor: theme.colors.adminRed }]}
            >
              <Text style={styles.addSalesmanText}>+ Add salesman</Text>
            </Pressable>
          </View>
        </View>

        {/* Heading */}
        <View style={styles.titleBlock}>
          <Text style={[styles.pageTitle, { color: theme.colors.text }]}>
            Welcome in, {user?.name.split(' ')[0] ?? 'Manager'}
          </Text>
          <Text style={[styles.pageSub, { color: theme.colors.muted }]}>
            {formatDay()} · {o.salesmenCount} salesmen
          </Text>
        </View>

        {/* Bento Grid */}
        <View style={[styles.bentoGrid, { gap }]}>
          {/* Tile 1: Hero Visits Today (Span 2 cols on wide, span 2 rows) */}
          <View
            style={[
              styles.tile,
              {
                backgroundColor: theme.colors.adminRed,
                borderWidth: 0,
                width: isWide ? '48.5%' : isTablet ? '100%' : '100%',
                minHeight: 356,
              },
            ]}
          >
            <Text style={styles.heroLabel}>Visits today</Text>
            <Text style={styles.heroNumber}>{o.visitsDone}</Text>
            <Text style={styles.heroSub}>
              {o.visitsTarget
                ? `Target ${o.visitsTarget} · ${targetPct}% done`
                : 'No target set for today'}
            </Text>
            <View style={styles.heroBarTrack}>
              <View style={[styles.heroBarFill, { width: `${targetPct}%` }]} />
            </View>
          </View>

          {/* Column with Tile 2 & 3 */}
          <View
            style={[
              styles.stackColumn,
              {
                width: isWide ? '48.5%' : isTablet ? '100%' : '100%',
                gap,
              },
            ]}
          >
            <View style={{ flexDirection: isPhone ? 'column' : 'row', gap }}>
              {/* Tile 2: Deals closed */}
              <View
                style={[
                  styles.tile,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    flex: 1,
                    minHeight: 170,
                  },
                ]}
              >
                <Text style={[styles.tileLabel, { color: theme.colors.muted }]}>Deals closed</Text>
                <Text style={[styles.metricBig, { color: theme.colors.text }]}>
                  {o.dealsClosed}
                </Text>
                <Text style={[styles.metricHighlightRed, { color: theme.colors.adminRedText }]}>
                  {formatINRShort(o.dealValueTotal)} total value
                </Text>
              </View>

              {/* Tile 3: Follow-ups due today */}
              <View
                style={[
                  styles.tile,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    flex: 1,
                    minHeight: 170,
                  },
                ]}
              >
                <Text style={[styles.tileLabel, { color: theme.colors.muted }]}>
                  Follow-ups due today
                </Text>
                <Text style={[styles.metricBig, { color: theme.colors.text }]}>
                  {o.followupsDue}
                </Text>
                <Text style={[styles.metricHighlightRed, { color: theme.colors.adminRedText }]}>
                  {o.followupsOverdue} overdue
                </Text>
              </View>
            </View>

            {/* Tile 4: Field status */}
            <View
              style={[
                styles.tile,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  minHeight: 170,
                },
              ]}
            >
              <Text style={[styles.tileTitle, { color: theme.colors.text }]}>Field status</Text>
              <View style={styles.fieldStatusBar}>
                {o.fieldStatus.inMeeting ? (
                  <View
                    style={[
                      styles.fieldStatusSeg,
                      { flex: o.fieldStatus.inMeeting, backgroundColor: theme.colors.adminRed },
                    ]}
                  />
                ) : null}
                {o.fieldStatus.onRoad ? (
                  <View
                    style={[
                      styles.fieldStatusSeg,
                      { flex: o.fieldStatus.onRoad, backgroundColor: theme.colors.text },
                    ]}
                  />
                ) : null}
                {o.fieldStatus.dayEnded ? (
                  <View
                    style={[
                      styles.fieldStatusSeg,
                      { flex: o.fieldStatus.dayEnded, backgroundColor: theme.colors.muted },
                    ]}
                  />
                ) : null}
                {o.fieldStatus.notStarted ? (
                  <View
                    style={[
                      styles.fieldStatusSeg,
                      { flex: o.fieldStatus.notStarted, backgroundColor: theme.colors.neutral },
                    ]}
                  />
                ) : null}
              </View>
              <View style={styles.fieldStatusRow}>
                <View style={styles.statusCol}>
                  <View
                    style={[styles.statusMiniDot, { backgroundColor: theme.colors.adminRed }]}
                  />
                  <Text style={[styles.statusMiniText, { color: theme.colors.text }]}>
                    In meeting
                  </Text>
                  <Text style={[styles.statusMiniCount, { color: theme.colors.text }]}>
                    {o.fieldStatus.inMeeting}
                  </Text>
                </View>

                <View style={styles.statusCol}>
                  <View style={[styles.statusMiniDot, { backgroundColor: theme.colors.text }]} />
                  <Text style={[styles.statusMiniText, { color: theme.colors.text }]}>
                    On the road
                  </Text>
                  <Text style={[styles.statusMiniCount, { color: theme.colors.text }]}>
                    {o.fieldStatus.onRoad}
                  </Text>
                </View>

                <View style={styles.statusCol}>
                  <View style={[styles.statusMiniDot, { backgroundColor: theme.colors.muted }]} />
                  <Text style={[styles.statusMiniText, { color: theme.colors.text }]}>
                    Day ended
                  </Text>
                  <Text style={[styles.statusMiniCount, { color: theme.colors.text }]}>
                    {o.fieldStatus.dayEnded}
                  </Text>
                </View>

                <View style={styles.statusCol}>
                  <View style={[styles.statusMiniDot, { backgroundColor: theme.colors.neutral }]} />
                  <Text style={[styles.statusMiniText, { color: theme.colors.text }]}>
                    Not started
                  </Text>
                  <Text style={[styles.statusMiniCount, { color: theme.colors.text }]}>
                    {o.fieldStatus.notStarted}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Tile 5: Live locations map tile (Span 2 cols on wide) */}
          <View
            style={[
              styles.tile,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                width: isWide ? '48.5%' : isTablet ? '100%' : '100%',
                minHeight: 356,
                padding: 16,
              },
            ]}
          >
            <View style={styles.mapAbsoluteContainer}>
              <Svg
                width="100%"
                height="100%"
                viewBox="0 0 600 360"
                preserveAspectRatio="xMidYMid slice"
                accessibilityRole="image"
                accessibilityLabel="Map showing live salesman locations"
              >
                <Rect width={600} height={360} fill={theme.colors.surface2} />
                <Path
                  d="M0 90H600M0 200H600M0 300H600M120 0V360M340 0V360M500 0V360"
                  stroke={theme.colors.border}
                  strokeWidth={10}
                />
                {/* 6 salesman markers with red halos */}
                {[
                  { cx: 150, cy: 150 },
                  { cx: 300, cy: 230 },
                  { cx: 420, cy: 120 },
                  { cx: 230, cy: 300 },
                  { cx: 480, cy: 260 },
                ]
                  .slice(0, onField)
                  .map((pin, i) => (
                    <React.Fragment key={i}>
                      <Circle
                        cx={pin.cx}
                        cy={pin.cy}
                        r={22}
                        fill={theme.colors.adminRed}
                        fillOpacity={0.2}
                      />
                      <Circle
                        cx={pin.cx}
                        cy={pin.cy}
                        r={8}
                        fill={theme.colors.adminRed}
                        stroke={theme.colors.onDanger}
                        strokeWidth={2.5}
                      />
                    </React.Fragment>
                  ))}
              </Svg>
            </View>

            <View style={[styles.liveLocationsBadge, { backgroundColor: theme.colors.bg }]}>
              <Text style={[styles.badgeText, { color: theme.colors.text }]}>
                Map placeholder · {onField} on the field
              </Text>
            </View>
          </View>

          {/* Tile 6 & 7: Outcomes & WhatsApp reminders stack */}
          <View
            style={[
              styles.stackColumn,
              {
                width: isWide ? '48.5%' : isTablet ? '100%' : '100%',
                gap,
              },
            ]}
          >
            <View style={{ flexDirection: isPhone ? 'column' : 'row', gap }}>
              {/* Tile 6: Outcomes */}
              <View
                style={[
                  styles.tile,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    flex: 1,
                    minHeight: 170,
                  },
                ]}
              >
                <Text style={[styles.tileTitle, { color: theme.colors.text, marginBottom: 10 }]}>
                  Outcomes
                </Text>
                <View style={styles.outcomesList}>
                  {/* Interested */}
                  <View style={styles.outcomeBarItem}>
                    <View style={styles.outcomeBarHeader}>
                      <Text style={[styles.outcomeName, { color: theme.colors.text }]}>
                        Interested
                      </Text>
                      <Text style={[styles.outcomeCount, { color: theme.colors.muted }]}>
                        {o.outcomes.interested}
                      </Text>
                    </View>
                    <View
                      style={[styles.outcomeBarTrack, { backgroundColor: theme.colors.border }]}
                    >
                      <View
                        style={[
                          styles.outcomeBarFill,
                          {
                            width: barPct(o.outcomes.interested),
                            backgroundColor: theme.colors.text,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Closed */}
                  <View style={styles.outcomeBarItem}>
                    <View style={styles.outcomeBarHeader}>
                      <Text style={[styles.outcomeName, { color: theme.colors.text }]}>Closed</Text>
                      <Text style={[styles.outcomeCount, { color: theme.colors.muted }]}>
                        {o.outcomes.closed}
                      </Text>
                    </View>
                    <View
                      style={[styles.outcomeBarTrack, { backgroundColor: theme.colors.border }]}
                    >
                      <View
                        style={[
                          styles.outcomeBarFill,
                          {
                            width: barPct(o.outcomes.closed),
                            backgroundColor: theme.colors.adminRed,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Not interested */}
                  <View style={styles.outcomeBarItem}>
                    <View style={styles.outcomeBarHeader}>
                      <Text style={[styles.outcomeName, { color: theme.colors.text }]}>
                        Not interested
                      </Text>
                      <Text style={[styles.outcomeCount, { color: theme.colors.muted }]}>
                        {o.outcomes.notInterested}
                      </Text>
                    </View>
                    <View
                      style={[styles.outcomeBarTrack, { backgroundColor: theme.colors.border }]}
                    >
                      <View
                        style={[
                          styles.outcomeBarFill,
                          {
                            width: barPct(o.outcomes.notInterested),
                            backgroundColor: theme.colors.neutral,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Tile 7: WhatsApp reminders */}
              <View
                style={[
                  styles.tile,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    flex: 1,
                    minHeight: 170,
                  },
                ]}
              >
                <Text style={[styles.tileLabel, { color: theme.colors.muted }]}>
                  WhatsApp reminders
                </Text>
                <Text style={[styles.metricBig, { color: theme.colors.text }]}>
                  {o.remindersSent}
                </Text>
                <Text style={[styles.tileLabel, { color: theme.colors.muted, marginTop: 8 }]}>
                  sent today
                </Text>
              </View>
            </View>

            {/* Tile 8: Today&apos;s progress */}
            <View
              style={[
                styles.tile,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  minHeight: 170,
                },
              ]}
            >
              <Text style={[styles.tileTitle, { color: theme.colors.text, marginBottom: 12 }]}>
                Today&apos;s progress
              </Text>
              <View style={styles.progressRows}>
                {progress.map((s) => (
                  <View key={s.id} style={styles.salesmanRow}>
                    <View style={[styles.salesmanAvatar, { backgroundColor: theme.colors.text }]}>
                      <Text style={[styles.salesmanInitials, { color: theme.colors.bg }]}>
                        {s.initials}
                      </Text>
                    </View>
                    <View style={styles.salesmanMeta}>
                      <Text style={[styles.salesmanTitle, { color: theme.colors.text }]}>
                        {s.name}
                      </Text>
                      <Text style={[styles.salesmanSubText, { color: theme.colors.muted }]}>
                        {s.status} · {s.visits} visits · {timeAgo(s.lastActivityAt)}
                      </Text>
                    </View>
                    <Text style={[styles.salesmanValue, { color: theme.colors.adminRedText }]}>
                      {s.dealValue > 0 ? `+${formatINR(s.dealValue)}` : formatINR(0)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Tile 9: Latest voice note with AI summary (Full width / span 2) */}
          <View
            style={[
              styles.tile,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                width: '100%',
                minHeight: 170,
              },
            ]}
          >
            <Text style={[styles.tileTitle, { color: theme.colors.text }]}>Latest voice note</Text>
            {latestVoice ? (
              <>
                <Text style={[styles.tileLabel, { color: theme.colors.muted, marginTop: 2 }]}>
                  {latestVoice.salesmanName} · {latestVoice.clientName}
                  {latestVoice.voiceNoteDuration ? ` · ${latestVoice.voiceNoteDuration}s` : ''}
                </Text>
                <Text style={[styles.aiSummaryText, { color: theme.colors.text }]}>
                  AI summary: {latestVoice.aiSummary}
                </Text>
                {latestVoice.voiceNoteUrl ? (
                  <View style={{ marginTop: 8 }}>
                    <VoicePlayer
                      uri={latestVoice.voiceNoteUrl}
                      seconds={latestVoice.voiceNoteDuration}
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={[styles.tileLabel, { color: theme.colors.muted, marginTop: 2 }]}>
                No voice notes yet.
              </Text>
            )}
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
              placeholder="e.g. Rahul Sharma"
            />

            <Field
              label="Phone number"
              value={newSalesmanPhone}
              onChangeText={setNewSalesmanPhone}
              keyboardType="phone-pad"
              placeholder="98765 43210"
            />

            {addError ? (
              <Text
                accessibilityRole="alert"
                style={{ color: theme.colors.adminRedText, fontFamily: fonts.regular }}
              >
                {addError}
              </Text>
            ) : null}
            <Button
              title="Add Salesman"
              loading={addSalesman.isPending}
              onPress={() => addSalesman.mutate({ name: newSalesmanName, phone: newSalesmanPhone })}
              variant="danger"
              size="normal"
            />
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
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  mainWrapper: {
    width: '100%',
    gap: 28,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  navPills: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: 24,
    borderWidth: 1,
    padding: 4,
  },
  navItem: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSalesmanBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSalesmanText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  titleBlock: {
    gap: 8,
  },
  pageTitle: {
    fontFamily: fonts.semibold,
    fontSize: 40,
    lineHeight: 44,
  },
  pageSub: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
  },
  stackColumn: {
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: '#FFFFFF',
  },
  heroNumber: {
    fontFamily: fonts.semibold,
    fontSize: 110,
    lineHeight: 115,
    color: '#FFFFFF',
    marginTop: 'auto',
  },
  heroSub: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: '#FFFFFF',
    marginTop: 10,
  },
  heroBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 12,
    overflow: 'hidden',
  },
  heroBarFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  tileLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  metricBig: {
    fontFamily: fonts.semibold,
    fontSize: 52,
    lineHeight: 56,
    marginTop: 'auto',
  },
  metricHighlightRed: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 8,
  },
  tileTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  fieldStatusBar: {
    flexDirection: 'row',
    height: 12,
    gap: 4,
    marginVertical: 14,
  },
  fieldStatusSeg: {
    borderRadius: 6,
  },
  fieldStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
  },
  statusCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusMiniDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  statusMiniText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    flex: 1,
  },
  statusMiniCount: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  mapAbsoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  liveLocationsBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    zIndex: 1,
  },
  badgeText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  outcomesList: {
    gap: 10,
  },
  outcomeBarItem: {
    gap: 4,
  },
  outcomeBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  outcomeName: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  outcomeCount: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  outcomeBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  outcomeBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressRows: {
    gap: 14,
  },
  salesmanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  salesmanAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salesmanInitials: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  salesmanMeta: {
    flex: 1,
    gap: 2,
  },
  salesmanTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  salesmanSubText: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  salesmanValue: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  voicePlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
  },
  playVoiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformSvgWrapper: {
    flex: 1,
    height: 36,
  },
  durationText: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  aiSummaryText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    padding: 24,
    gap: 16,
    borderWidth: 1,
    maxWidth: 440,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
  },
});
