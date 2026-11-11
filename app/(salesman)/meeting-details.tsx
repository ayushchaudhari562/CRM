import React, { useState, useEffect, useRef } from 'react';
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
import { ChevronLeft, Mic, Check, Paperclip, FileText, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import { useTheme, fonts } from '../../src/theme';
import {
  Button,
  Field,
  Chip,
  SegmentedControl,
  Card,
} from '../../src/components';
import { useAppStore } from '../../src/store';
import { crmService } from '../../src/services';
import { products as availableProducts } from '../../src/mocks/data';
import type { Client, MeetingOutcome } from '../../src/types';

const meetingValidationSchema = z.object({
  clientName: z.string().trim().min(2, 'Client name must be at least 2 characters'),
  businessType: z.string().trim().min(2, 'Business type is required'),
  contactNumber: z.string().trim().min(8, 'Enter a valid contact number'),
  products: z.array(z.string()).min(1, 'Select at least one product discussed'),
  outcome: z.enum(['Interested', 'Closed', 'Not interested']),
});

export default function MeetingDetailsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, meetingDraft, updateMeetingDraft } = useAppStore();

  // Form State
  const [clientName, setClientName] = useState(meetingDraft.clientName || 'Client A');
  const [businessType, setBusinessType] = useState(meetingDraft.businessType || 'Kirana store');
  const [contactNumber, setContactNumber] = useState(meetingDraft.contactNumber || '+91 90000 00001');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    meetingDraft.products.length ? meetingDraft.products : ['Product 1', 'Product 2']
  );
  const [dealValue, setDealValue] = useState(meetingDraft.dealValue || '25,000');
  const [outcome, setOutcome] = useState<MeetingOutcome>(meetingDraft.outcome || 'Interested');
  const [nextVisit, setNextVisit] = useState(
    meetingDraft.nextVisit || '15 Nov 2026, 11:00 AM'
  );
  const [whatsappReminder, setWhatsappReminder] = useState(meetingDraft.whatsappReminder ?? true);
  const [attachments, setAttachments] = useState<
    { id: string; name: string; uri: string; type: 'photo' | 'file'; size: number }[]
  >(meetingDraft.attachments || []);

  // Voice note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(24);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Autocomplete state
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [isExistingClient, setIsExistingClient] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search clients when typing
  const handleClientNameChange = async (query: string) => {
    setClientName(query);
    if (errors.clientName) setErrors((prev) => ({ ...prev, clientName: '' }));

    if (query.trim().length > 0) {
      const results = await crmService.searchClients(user.id, query);
      setClientSuggestions(results);
      const exactMatch = results.find(
        (c) => c.name.toLowerCase() === query.trim().toLowerCase()
      );
      if (exactMatch) {
        setIsExistingClient(true);
        setBusinessType(exactMatch.businessType);
        if (exactMatch.contactNumber) setContactNumber(exactMatch.contactNumber);
      } else {
        setIsExistingClient(false);
      }
    } else {
      setClientSuggestions([]);
      setIsExistingClient(false);
    }
  };

  const selectClient = (client: Client) => {
    setClientName(client.name);
    setBusinessType(client.businessType);
    if (client.contactNumber) setContactNumber(client.contactNumber);
    setIsExistingClient(true);
    setClientSuggestions([]);
  };

  // Toggle products
  const toggleProduct = (prod: string) => {
    if (selectedProducts.includes(prod)) {
      setSelectedProducts(selectedProducts.filter((p) => p !== prod));
    } else {
      setSelectedProducts([...selectedProducts, prod]);
    }
    if (errors.products) setErrors((prev) => ({ ...prev, products: '' }));
  };

  // Hold-to-record voice note
  const startRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    updateMeetingDraft({
      voiceNoteDuration: recordingSeconds || 24,
      voiceNoteUri: 'mock://recording/voice.m4a',
    });
  };

  // Format timer
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Add photo or file
  const handleAttachFile = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });
      if (!doc.canceled && doc.assets[0]) {
        const file = doc.assets[0];
        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}`,
            name: file.name,
            uri: file.uri,
            type: 'file',
            size: file.size || 1024,
          },
        ]);
      }
    } catch (e) {
      // Fallback
      setAttachments((prev) => [
        ...prev,
        {
          id: `att-${Date.now()}`,
          name: 'Shop_Quotation.pdf',
          uri: 'mock://files/quote.pdf',
          type: 'file',
          size: 245000,
        },
      ]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Submit and validate with ZOD
  const handleSubmit = async () => {
    const rawData = {
      clientName,
      businessType,
      contactNumber,
      products: selectedProducts,
      outcome,
    };

    const validation = meetingValidationSchema.safeParse(rawData);
    if (!validation.success) {
      const formErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(formErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const numericDealValue = parseInt(dealValue.replace(/[^0-9]/g, ''), 10) || 0;

    const newMeeting = await crmService.createMeeting(user.id, {
      clientName,
      businessType,
      contactNumber,
      products: selectedProducts,
      dealValue: numericDealValue,
      outcome,
      voiceNoteUrl: 'mock://voice/latest',
      voiceNoteDuration: recordingSeconds || 24,
      aiSummary: 'Client ko rate thoda zyada laga. Sample dekhna chahta hai. 7 din baad dobara milne ko bola.',
      nextVisit,
      whatsappReminder,
      attachments,
      location: { latitude: 19.076, longitude: 72.8777 },
    });

    updateMeetingDraft({
      clientName,
      businessType,
      contactNumber,
      products: selectedProducts,
      dealValue,
      outcome,
      nextVisit,
      whatsappReminder,
    });

    setIsSubmitting(false);
    router.push('/(salesman)/meeting-saved');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Navigation */}
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
        {/* Client Name Input */}
        <View style={styles.inputGroup}>
          <Field
            label="Client name"
            value={clientName}
            onChangeText={handleClientNameChange}
            placeholder="Search or enter client name"
            error={errors.clientName}
          />

          {isExistingClient ? (
            <Text style={[styles.existingFoundText, { color: theme.colors.accent }]}>
              Existing client found. Details filled in.
            </Text>
          ) : null}

          {/* Autocomplete suggestions */}
          {clientSuggestions.length > 0 && !isExistingClient ? (
            <View
              style={[
                styles.suggestionsBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              {clientSuggestions.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => selectClient(c)}
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

        {/* Business Type */}
        <Field
          label="Business type"
          value={businessType}
          onChangeText={(val) => {
            setBusinessType(val);
            if (errors.businessType) setErrors((prev) => ({ ...prev, businessType: '' }));
          }}
          placeholder="e.g. Kirana store, Pharmacy"
          error={errors.businessType}
        />

        {/* Contact Number */}
        <Field
          label="Contact number"
          value={contactNumber}
          onChangeText={(val) => {
            setContactNumber(val);
            if (errors.contactNumber) setErrors((prev) => ({ ...prev, contactNumber: '' }));
          }}
          keyboardType="phone-pad"
          placeholder="+91 90000 00000"
          error={errors.contactNumber}
        />

        {/* Products Discussed Multi-select */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
            Products discussed
          </Text>
          <View style={styles.chipsRow}>
            {availableProducts.map((prod) => {
              const selected = selectedProducts.includes(prod);
              return (
                <Chip
                  key={prod}
                  label={prod}
                  selected={selected}
                  onPress={() => toggleProduct(prod)}
                />
              );
            })}
          </View>
          {errors.products ? (
            <Text style={[styles.errorText, { color: theme.colors.adminRedText }]}>
              {errors.products}
            </Text>
          ) : null}
        </View>

        {/* Deal Value */}
        <Field
          label="Deal value"
          value={dealValue ? (dealValue.startsWith('₹') ? dealValue : `₹ ${dealValue}`) : ''}
          onChangeText={(val) => {
            const clean = val.replace(/[^0-9,]/g, '');
            setDealValue(clean);
          }}
          keyboardType="numeric"
          placeholder="₹ 0"
        />

        {/* Meeting Outcome Segmented Control */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
            Meeting outcome
          </Text>
          <SegmentedControl<MeetingOutcome>
            value={outcome}
            onChange={(val) => setOutcome(val)}
            options={[
              { value: 'Interested', label: 'Interested' },
              { value: 'Closed', label: 'Closed' },
              { value: 'Not interested', label: 'Not interested' },
            ]}
          />
        </View>

        {/* Hold to Record Voice Note */}
        <View style={[styles.voiceNoteCard, { backgroundColor: theme.colors.surface }]}>
          <Pressable
            onPressIn={startRecording}
            onPressOut={stopRecording}
            accessibilityRole="button"
            accessibilityLabel="Hold to record voice note"
            style={({ pressed }) => [
              styles.micButton,
              {
                backgroundColor: theme.colors.accent,
                transform: [{ scale: pressed || isRecording ? 1.08 : 1 }],
              },
            ]}
          >
            <Mic size={30} color={theme.colors.onAccent} />
          </Pressable>

          <Text style={[styles.recordText, { color: theme.colors.text }]}>
            {isRecording
              ? `Recording... · ${formatTimer(recordingSeconds)}`
              : `Hold to record · ${formatTimer(recordingSeconds)}`}
          </Text>

          <Text style={[styles.summaryHint, { color: theme.colors.muted }]}>
            Text summary appears after saving
          </Text>
        </View>

        {/* Next Visit Date-Time Picker */}
        <Field
          label="Next visit"
          value={nextVisit}
          onChangeText={setNextVisit}
          placeholder="e.g. 15 Nov 2026, 11:00 AM"
        />

        {/* WhatsApp Reminder Toggle */}
        <Pressable
          onPress={() => setWhatsappReminder(!whatsappReminder)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: whatsappReminder }}
          accessibilityLabel="Toggle WhatsApp reminder"
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

        {/* Attached Files List */}
        {attachments.length > 0 ? (
          <View style={styles.attachmentsList}>
            {attachments.map((att) => (
              <View
                key={att.id}
                style={[styles.attachmentBadge, { backgroundColor: theme.colors.surface2 }]}
              >
                <FileText size={16} color={theme.colors.accent} />
                <Text
                  style={[styles.attachmentName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {att.name}
                </Text>
                <Pressable
                  onPress={() => removeAttachment(att.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove attached file"
                >
                  <X size={14} color={theme.colors.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* Add photo or file button */}
        <Button
          title="Add photo or file"
          onPress={handleAttachFile}
          variant="secondary"
          size="compact"
          icon={<Paperclip size={18} color={theme.colors.text} />}
        />

        <View style={styles.spacer} />

        {/* Sticky Submit Button */}
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
