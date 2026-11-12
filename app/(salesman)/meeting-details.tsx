import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ChevronLeft, Check, CalendarDays } from 'lucide-react-native';
import { z } from 'zod';
import { useTheme, fonts } from '../../src/theme';
import {
  Button,
  Field,
  Chip,
  SegmentedControl,
  EmptyView,
  VoiceRecorder,
  VOICE_CONTENT_TYPE,
  type VoiceClip,
} from '../../src/components';
import { useAppStore } from '../../src/store';
import { crmService } from '../../src/services';
import { formatDateTime } from '../../src/utils/format';
import type { Client, MeetingOutcome } from '../../src/types';

const schema = z.object({
  clientName: z.string().trim().min(2, 'Client name must be at least 2 characters'),
  businessType: z.string().trim().min(2, 'Business type is required'),
  contactNumber: z
    .string()
    .trim()
    .refine((v) => v === '' || v.replace(/\D/g, '').length >= 10, 'Enter a valid 10-digit number'),
});

const NEXT_VISIT_HOUR = 11; // default time for "Tomorrow" and the time picker

/** Tomorrow at 11:00 local time. */
function tomorrowAt11(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(NEXT_VISIT_HOUR, 0, 0, 0);
  return d;
}

const CAN_PICK_DATE = Platform.OS === 'android'; // native calendar dialog

export default function MeetingDetailsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, checkIn, setCheckIn, setLastSavedMeeting } = useAppStore();

  // One id per form: pressing Submit again after a network error will not create a duplicate.
  const [clientRequestId] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );

  const [clientId, setClientId] = useState<string | null>(null); // set when an existing client is picked
  const [clientName, setClientName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [savedAddress, setSavedAddress] = useState(false); // picked client already has an address
  const [dealValue, setDealValue] = useState('');
  const [outcome, setOutcome] = useState<MeetingOutcome>('Interested');
  const [note, setNote] = useState('');
  const [nextChoice, setNextChoice] = useState<'none' | 'tomorrow' | 'date'>('none');
  const [nextVisit, setNextVisit] = useState<Date | null>(null);
  const [whatsappReminder, setWhatsappReminder] = useState(true);
  const [voice, setVoice] = useState<VoiceClip | null>(null);
  // Uploaded once: pressing Submit again after an error does not upload the same file twice.
  const [uploadedVoice, setUploadedVoice] = useState<{ uri: string; path: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client search, debounced (wait 300 ms after typing stops). Skipped once a client is picked.
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  useEffect(() => {
    const q = clientName.trim();
    if (clientId || q.length < 2) return;
    let stale = false;
    const t = setTimeout(() => {
      crmService
        .searchClients(q)
        .then((list) => !stale && setSuggestions(list))
        .catch(() => !stale && setSuggestions([]));
    }, 300);
    return () => {
      stale = true; // ignore answers for an older search text
      clearTimeout(t);
    };
  }, [clientName, clientId]);

  const visibleSuggestions = clientId || clientName.trim().length < 2 ? [] : suggestions;

  if (!user) return null;
  if (!checkIn) {
    return (
      <EmptyView
        title="Check in first"
        description="Start the meeting from the check-in screen so time and location are saved."
        actionTitle="Go to check-in"
        onAction={() => router.replace('/(salesman)/checkin')}
      />
    );
  }

  const clearError = (key: string) => errors[key] && setErrors((e) => ({ ...e, [key]: '' }));

  const onClientNameChange = (text: string) => {
    setClientName(text);
    setClientId(null); // typing again = not the picked client any more
    setSavedAddress(false);
    clearError('clientName');
  };

  const selectClient = (c: Client) => {
    setClientId(c.id);
    setClientName(c.name);
    setBusinessType(c.businessType);
    setContactNumber(c.contactNumber ?? '');
    setShopAddress(c.address ?? '');
    setSavedAddress(!!c.address);
  };

  const chooseNone = () => {
    setNextChoice('none');
    setNextVisit(null);
  };
  const chooseTomorrow = () => {
    setNextChoice('tomorrow');
    setNextVisit(tomorrowAt11());
  };
  // Calendar first, then the time (Android dialogs). Cancel keeps the previous choice.
  const pickDate = () => {
    const start = nextChoice === 'date' && nextVisit ? nextVisit : tomorrowAt11();
    DateTimePickerAndroid.open({
      value: start,
      mode: 'date',
      minimumDate: new Date(),
      onChange: (e, day) => {
        if (e.type !== 'set' || !day) return;
        DateTimePickerAndroid.open({
          value: start,
          mode: 'time',
          onChange: (e2, time) => {
            if (e2.type !== 'set' || !time) return;
            const d = new Date(day);
            d.setHours(time.getHours(), time.getMinutes(), 0, 0);
            setNextChoice('date');
            setNextVisit(d);
          },
        });
      },
    });
  };

  const handleSubmit = async () => {
    const parsed = schema.safeParse({ clientName, businessType, contactNumber });
    if (!parsed.success) {
      const formErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        if (i.path[0]) formErrors[String(i.path[0])] = i.message;
      });
      return setErrors(formErrors);
    }
    setErrors({});
    setSubmitError('');
    setIsSubmitting(true);
    try {
      let voiceNote: { path: string; seconds: number } | null = null;
      if (voice) {
        const path =
          uploadedVoice?.uri === voice.uri
            ? uploadedVoice.path
            : await crmService.uploadLocal('voice', voice.uri, VOICE_CONTENT_TYPE);
        setUploadedVoice({ uri: voice.uri, path });
        voiceNote = { path, seconds: voice.seconds };
      }
      const saved = await crmService.createMeeting({
        clientRequestId,
        clientId,
        clientName: clientName.trim(),
        businessType: businessType.trim(),
        contactNumber: contactNumber.trim() || null,
        clientAddress: shopAddress.trim() || null,
        productIds: [],
        dealValue: Number(dealValue.replace(/\D/g, '')) || 0,
        outcome,
        note: note.trim() || null,
        nextVisit: nextVisit?.toISOString() ?? null,
        whatsappReminder: !!nextVisit && whatsappReminder,
        checkInAt: checkIn.checkInAt,
        location: checkIn.location,
        voiceNote,
      });
      setLastSavedMeeting(saved);
      setCheckIn(null);
      qc.invalidateQueries({ queryKey: ['home'] });
      qc.invalidateQueries({ queryKey: ['meetings'] });
      qc.invalidateQueries({ queryKey: ['my-targets'] });
      router.replace('/(salesman)/meeting-saved');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <Text style={[styles.barTitle, { color: theme.colors.text }]}>Meeting details</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Client name + search */}
        <View style={styles.inputGroup}>
          <Field
            label="Client name"
            value={clientName}
            onChangeText={onClientNameChange}
            placeholder="Search your clients or type a new name"
            error={errors.clientName}
          />
          {clientId ? (
            <Text style={[styles.existingFoundText, { color: theme.colors.accent }]}>
              Existing client found. Details filled in.
            </Text>
          ) : clientName.trim().length >= 2 && visibleSuggestions.length === 0 ? (
            <Text style={[styles.existingFoundText, { color: theme.colors.muted }]}>
              New client: will be added to your list.
            </Text>
          ) : null}
          {visibleSuggestions.length > 0 ? (
            <View
              style={[
                styles.suggestionsBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              {visibleSuggestions.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => selectClient(c)}
                  accessibilityRole="button"
                  style={styles.suggestionItem}
                >
                  <Text style={[styles.suggestionName, { color: theme.colors.text }]}>
                    {c.name}
                  </Text>
                  <Text style={[styles.suggestionSub, { color: theme.colors.muted }]}>
                    {c.businessType}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <Field
          label="Business type"
          value={businessType}
          onChangeText={(v) => {
            setBusinessType(v);
            clearError('businessType');
          }}
          editable={!clientId}
          placeholder="e.g. Kirana store, Pharmacy"
          error={errors.businessType}
        />

        <Field
          label="Contact number (optional)"
          value={contactNumber}
          onChangeText={(v) => {
            setContactNumber(v);
            clearError('contactNumber');
          }}
          editable={!clientId}
          keyboardType="phone-pad"
          placeholder="98765 43210"
          error={errors.contactNumber}
        />

        <Field
          label="Shop address (exact)"
          value={shopAddress}
          onChangeText={setShopAddress}
          editable={!savedAddress}
          placeholder="e.g. Shop 12, Main Bazar, near SBI ATM"
          maxLength={300}
          multiline
          hint={
            checkIn.location?.address
              ? `Nearby (GPS): ${checkIn.location.address}`
              : 'GPS address not found. Write the address yourself.'
          }
        />

        <Field
          label="Deal value (₹)"
          value={dealValue}
          onChangeText={(v) => setDealValue(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
        />

        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>Meeting outcome</Text>
          <SegmentedControl<MeetingOutcome>
            value={outcome}
            onChange={setOutcome}
            options={[
              { value: 'Interested', label: 'Interested' },
              { value: 'Closed', label: 'Closed' },
              { value: 'Not interested', label: 'Not interested' },
            ]}
          />
        </View>

        <Field
          label="Note (what was discussed)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Wants a sample, call back after 7 days"
          multiline
          containerStyle={styles.noteContainer}
          inputStyle={styles.noteInput}
        />

        <VoiceRecorder value={voice} onChange={setVoice} disabled={isSubmitting} />

        {/* Next visit */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>Next visit</Text>
          <View style={styles.chipsRow}>
            <Chip label="None" selected={nextChoice === 'none'} onPress={chooseNone} />
            <Chip label="Tomorrow" selected={nextChoice === 'tomorrow'} onPress={chooseTomorrow} />
            {CAN_PICK_DATE ? (
              <Chip
                label={
                  nextChoice === 'date' && nextVisit
                    ? nextVisit.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : 'Pick date'
                }
                icon={
                  <CalendarDays
                    size={14}
                    color={nextChoice === 'date' ? theme.colors.onAccent : theme.colors.text}
                  />
                }
                selected={nextChoice === 'date'}
                onPress={pickDate}
              />
            ) : null}
          </View>
          {nextVisit ? (
            <Text style={[styles.summaryHint, { color: theme.colors.muted }]}>
              Follow-up on {formatDateTime(nextVisit)}
            </Text>
          ) : null}
        </View>

        {nextVisit ? (
          <Pressable
            onPress={() => setWhatsappReminder(!whatsappReminder)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: whatsappReminder }}
            accessibilityLabel="WhatsApp reminder"
            style={({ pressed }) => [
              styles.whatsappCard,
              { backgroundColor: theme.colors.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View
              style={[
                styles.checkCircle,
                {
                  backgroundColor: whatsappReminder
                    ? theme.colors.accentSoftBg
                    : theme.colors.surface2,
                },
              ]}
            >
              {whatsappReminder ? (
                <Check size={16} color={theme.colors.accent} strokeWidth={2.5} />
              ) : null}
            </View>
            <Text style={[styles.whatsappText, { color: theme.colors.text }]}>
              {whatsappReminder ? 'WhatsApp reminder on' : 'WhatsApp reminder off'}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.spacer} />

        {submitError ? (
          <Text
            accessibilityRole="alert"
            style={[styles.errorText, { color: theme.colors.adminRedText }]}
          >
            {submitError}
          </Text>
        ) : null}
        <Button
          title="Submit"
          onPress={handleSubmit}
          loading={isSubmitting}
          variant="primary"
          size="normal"
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  noteContainer: {},
  noteInput: { minHeight: 76, textAlignVertical: 'top' },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  barTitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 16,
    flexGrow: 1,
  },
  inputGroup: {
    gap: 6,
  },
  existingFoundText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  suggestionsBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B2E',
  },
  suggestionName: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  suggestionSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 4,
  },
  voiceNoteCard: {
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  summaryHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  whatsappCard: {
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappText: {
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  attachmentsList: {
    gap: 8,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  attachmentName: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  spacer: {
    minHeight: 16,
  },
  submitBtn: {
    marginBottom: 8,
  },
});
