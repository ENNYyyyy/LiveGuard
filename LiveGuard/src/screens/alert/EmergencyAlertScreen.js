import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { createEmergencyAlert, fetchAlertHistory, fetchPriorityQuestions, loadQuestionsFromCache } from '../../store/alertSlice';
import { getCurrentPosition } from '../../services/locationService';
import ChipSelector from '../../components/ChipSelector';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingOverlay from '../../components/LoadingOverlay';
import NoInternetBanner from '../../components/NoInternetBanner';
import useNetInfo from '../../hooks/useNetInfo';
import { useTheme } from '../../context/ThemeContext';
import { EMERGENCY_TYPES } from '../../utils/constants';
import { getContacts } from '../../services/contactsService';
import { Ionicons } from '@expo/vector-icons';

const PENDING_ALERT_KEY = 'PENDING_ALERT';

const EmergencyAlertScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const submitError = useSelector((state) => state.alert.submitError);
  const rateLimitUntil = useSelector((state) => state.alert.rateLimitUntil);
  const priorityQuestions = useSelector((state) => state.alert.priorityQuestions);
  const questionsLoading = useSelector((state) => state.alert.questionsLoading);
  const questionsError = useSelector((state) => state.alert.questionsError);
  const questionsCache = useSelector((state) => state.alert.questionsCache);
  const { isConnected } = useNetInfo();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [selectedType, setSelectedType] = useState(null);
  const [errors, setErrors] = useState({});
  const [questionErrors, setQuestionErrors] = useState({});
  const [riskAnswers, setRiskAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasPendingAlert, setHasPendingAlert] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Live countdown when rate-limited
  useEffect(() => {
    if (!rateLimitUntil) {
      setRateLimitCountdown(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      setRateLimitCountdown(remaining);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [rateLimitUntil]);

  const lastSelectedTypeRef = useRef(null);
  const questionsCacheRef = useRef(questionsCache);
  useEffect(() => { questionsCacheRef.current = questionsCache; }, [questionsCache]);
  // Start fetching location immediately on mount so it's ready (or nearly ready)
  // by the time the user finishes filling the form and taps submit.
  const locationPrefetchRef = useRef(null);
  useEffect(() => {
    locationPrefetchRef.current = getCurrentPosition().catch(() => null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_ALERT_KEY);
        if (raw) {
          const pending = JSON.parse(raw);
          setHasPendingAlert(true);
          if (pending.alert_type) setSelectedType(pending.alert_type);
          if (pending.risk_answers && typeof pending.risk_answers === 'object') {
            setRiskAnswers(pending.risk_answers);
          }
        }
      } catch {
        // Ignore read errors
      }
      const contacts = await getContacts();
      setEmergencyContacts(Array.isArray(contacts) ? contacts : []);
    })();
  }, []);

  useEffect(() => {
    if (!selectedType) {
      setRiskAnswers({});
      setQuestionErrors({});
      lastSelectedTypeRef.current = null;
      return;
    }

    if (lastSelectedTypeRef.current && lastSelectedTypeRef.current !== selectedType) {
      setRiskAnswers({});
      setQuestionErrors({});
    }
    lastSelectedTypeRef.current = selectedType;
    const cached = questionsCacheRef.current[selectedType];
    if (cached) {
      dispatch(loadQuestionsFromCache({ questions: cached.questions, version: cached.version }));
    } else {
      dispatch(fetchPriorityQuestions(selectedType));
    }
  }, [dispatch, selectedType]);

  const validate = () => {
    const formErrors = {};
    const answerErrors = {};

    if (!selectedType) {
      formErrors.type = 'Please select an emergency type';
    }
    if (selectedType && questionsLoading) {
      formErrors.questions = 'Please wait while risk questions load.';
    }
    if (selectedType && !questionsLoading && priorityQuestions.length === 0) {
      formErrors.questions = 'Risk questions are required before sending this alert.';
    }
    if (questionsError) {
      formErrors.questions = 'Unable to load risk questions. Retry to continue.';
    }

    priorityQuestions.forEach((question) => {
      const answer = riskAnswers[question.id];
      const missing =
        answer === undefined ||
        answer === null ||
        (typeof answer === 'string' && answer.trim() === '');

      if (question.required && missing) {
        answerErrors[question.id] = 'This answer is required.';
      }
    });

    setErrors(formErrors);
    setQuestionErrors(answerErrors);
    return Object.keys(formErrors).length === 0 && Object.keys(answerErrors).length === 0;
  };

  const updateRiskAnswer = (questionId, value) => {
    setRiskAnswers((prev) => ({ ...prev, [questionId]: value }));
    setQuestionErrors((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const buildRiskAnswersPayload = () => {
    const payload = {};
    priorityQuestions.forEach((question) => {
      const value = riskAnswers[question.id];
      if (value === undefined || value === null || value === '') {
        return;
      }
      payload[question.id] = value;
    });
    return payload;
  };

  const handleSubmit = () => {
    if (validate()) sendAlert();
  };

  const sendAlert = async () => {
    setLoading(true);
    try {
      // Await the prefetch that started on mount — if it already resolved this is instant.
      // If it failed (null), fall back to a fresh fetch now.
      const locationData =
        (locationPrefetchRef.current && (await locationPrefetchRef.current)) ||
        (await getCurrentPosition());

      const alertPayload = {
        alert_type: selectedType,
        risk_answers: buildRiskAnswersPayload(),
        latitude: parseFloat(locationData.latitude.toFixed(7)),
        longitude: parseFloat(locationData.longitude.toFixed(7)),
        accuracy: locationData.accuracy,
        altitude: locationData.altitude ?? null,
        city: locationData.city ?? null,
        state: locationData.state ?? null,
      };

      const result = await dispatch(createEmergencyAlert(alertPayload));

      if (createEmergencyAlert.fulfilled.match(result)) {
        const newAlertId = result.payload?.alert_id;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Auto-notify emergency contacts via SMS
        const phones = emergencyContacts.map((c) => c?.phone).filter(Boolean);
        if (phones.length > 0) {
          const typeLabel = (selectedType || 'Emergency').replace(/_/g, ' ');
          const mapsUrl =
            alertPayload.latitude != null && alertPayload.longitude != null
              ? `https://maps.google.com/?q=${alertPayload.latitude},${alertPayload.longitude}`
              : '';
          const message =
            `SOS alert via LiveGuard.\nEmergency: ${typeLabel}.` +
            (mapsUrl ? `\nLocation: ${mapsUrl}` : '') +
            '\nPlease check on me immediately.';
          const encoded = encodeURIComponent(message);
          const phoneList = phones.join(',');
          const smsUrl =
            Platform.OS === 'ios'
              ? `sms:${phoneList}&body=${encoded}`
              : `sms:?addresses=${phoneList}&body=${encoded}`;
          Linking.openURL(smsUrl).catch(() => {});
        }

        AsyncStorage.removeItem(PENDING_ALERT_KEY).catch(() => {});
        dispatch(fetchAlertHistory());
        setHasPendingAlert(false);
        navigation.replace('AlertStatusScreen', { alert_id: newAlertId ?? undefined });
      } else {
        await AsyncStorage.setItem(PENDING_ALERT_KEY, JSON.stringify(alertPayload));
        setHasPendingAlert(true);
      }
    } catch (err) {
      const msg = err?.message || 'Unable to get location. Please try again.';
      Alert.alert('Location Error', msg);
      try {
        await AsyncStorage.setItem(
          PENDING_ALERT_KEY,
          JSON.stringify({ alert_type: selectedType, risk_answers: buildRiskAnswersPayload() })
        );
      } catch {
        // Ignore write errors
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismissPending = async () => {
    await AsyncStorage.removeItem(PENDING_ALERT_KEY);
    setHasPendingAlert(false);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setErrors((prev) => ({ ...prev, type: null, questions: null }));
  };

  const renderQuestionInput = (question) => {
    const answer = riskAnswers[question.id];

    if (question.type === 'boolean') {
      const options = [
        { key: true, label: 'Yes' },
        { key: false, label: 'No' },
      ];
      return (
        <View style={styles.answerChips}>
          {options.map((option) => {
            const active = answer === option.key;
            return (
              <TouchableOpacity
                key={option.label}
                style={[styles.answerChip, active && styles.answerChipActive]}
                onPress={() => updateRiskAnswer(question.id, option.key)}
              >
                <Text style={[styles.answerChipText, active && styles.answerChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (question.type === 'single_select') {
      return (
        <View style={styles.answerChips}>
          {question.options.map((option) => {
            const active = answer === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.answerChip, active && styles.answerChipActive]}
                onPress={() => updateRiskAnswer(question.id, option.value)}
              >
                <Text style={[styles.answerChipText, active && styles.answerChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LoadingOverlay visible={loading} message="Sending alert…" />

      <NoInternetBanner visible={!isConnected} />

      {/* Header */}
      <View style={[styles.header, !isConnected && styles.headerOffsetForBanner]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Emergency Alert</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Pending alert banner */}
        {hasPendingAlert && (
          <View style={styles.pendingBanner}>
            <View style={styles.pendingBannerLeft}>
              <Text style={styles.pendingBannerTitle}>You have an unsent alert.</Text>
              <Text style={styles.pendingBannerSub}>Form pre-filled. Tap Confirm to retry.</Text>
            </View>
            <TouchableOpacity onPress={handleDismissPending} style={styles.pendingBannerDismiss}>
              <Text style={styles.pendingBannerDismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rate-limit banner */}
        {rateLimitCountdown > 0 ? (
          <View style={styles.rateLimitCard}>
            <View style={styles.rateLimitRow}>
              <Ionicons name="time-outline" size={18} color={colors.WARNING_TEXT} />
              <Text style={styles.rateLimitTitle}>Too many alerts sent</Text>
            </View>
            <Text style={styles.rateLimitMsg}>
              You can send another alert in{' '}
              <Text style={styles.rateLimitTimer}>{rateLimitCountdown}s</Text>.
            </Text>
          </View>
        ) : null}

        {/* Submission error with retry */}
        {submitError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>Alert Failed</Text>
            <Text style={styles.errorCardMsg}>{submitError}</Text>
            <TouchableOpacity style={styles.errorRetryBtn} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.errorRetryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Emergency Type */}
        <ChipSelector
          label="Emergency Type"
          options={EMERGENCY_TYPES}
          selectedKey={selectedType}
          onSelect={handleTypeSelect}
          required
        />
        {errors.type ? <Text style={styles.errorText}>{errors.type}</Text> : null}

        <View style={styles.gap20} />

        {selectedType && (
          <View>
            <View style={styles.questionsHeader}>
              <Text style={styles.questionsHeaderTitle}>Risk Assessment Questions</Text>
              <Text style={styles.questionsHeaderSub}>
                Your answers are used to compute priority automatically.
              </Text>
            </View>

            {questionsLoading ? (
              <View style={styles.questionsLoadingWrap}>
                <ActivityIndicator size="small" color={colors.PRIMARY_BLUE} />
                <Text style={styles.questionsLoadingText}>Loading questions...</Text>
              </View>
            ) : questionsError ? (
              <View style={styles.questionErrorCard}>
                <Text style={styles.errorCardTitle}>Unable to load questions</Text>
                <Text style={styles.errorCardMsg}>{questionsError}</Text>
                <TouchableOpacity
                  style={styles.errorRetryBtn}
                  onPress={() => dispatch(fetchPriorityQuestions(selectedType))}
                >
                  <Text style={styles.errorRetryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.questionsList}>
                {priorityQuestions.map((question) => (
                  <View key={question.id} style={styles.questionCard}>
                    <Text style={styles.questionLabel}>
                      {question.label}
                      {question.required ? <Text style={styles.requiredMark}> *</Text> : null}
                    </Text>
                    {renderQuestionInput(question)}
                    {questionErrors[question.id] ? (
                      <Text style={styles.errorText}>{questionErrors[question.id]}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {errors.questions ? <Text style={styles.errorText}>{errors.questions}</Text> : null}

        <View style={styles.gap32} />

        {/* Warning */}
        <View style={styles.warningCard}>
          <View style={styles.warningInner}>
            <Ionicons name="warning-outline" size={18} color={colors.WARNING_TEXT} />
            <Text style={styles.warningText}>
              Only use this in genuine emergencies. False alerts may result in penalties.
            </Text>
          </View>
        </View>

        <View style={styles.gap20} />

        <PrimaryButton
          title={rateLimitCountdown > 0 ? `Please wait ${rateLimitCountdown}s` : 'Confirm Emergency Alert'}
          onPress={rateLimitCountdown > 0 ? undefined : handleSubmit}
          loading={loading}
          disabled={rateLimitCountdown > 0}
        />

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_LIGHT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_GREY,
  },
  headerOffsetForBanner: {
    marginTop: 44,
  },
  backBtn: {
    width: 32,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.TEXT_DARK,
  },
  headerRight: {
    width: 32,
  },
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.PENDING_BANNER_BG,
    borderWidth: 1,
    borderColor: colors.PENDING_BANNER_BORDER,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  pendingBannerLeft: {
    flex: 1,
    gap: 2,
  },
  pendingBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.PENDING_TITLE_TEXT,
  },
  pendingBannerSub: {
    fontSize: 12,
    color: colors.PENDING_SUB_TEXT,
  },
  pendingBannerDismiss: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  pendingBannerDismissText: {
    fontSize: 16,
    color: colors.PENDING_SUB_TEXT,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: colors.ERROR_CARD_BG,
    borderWidth: 1,
    borderColor: colors.ERROR_CARD_BORDER,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 8,
    alignItems: 'flex-start',
  },
  errorCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ERROR_RED,
  },
  errorCardMsg: {
    fontSize: 13,
    color: colors.ERROR_RED,
    lineHeight: 19,
  },
  errorRetryBtn: {
    marginTop: 4,
    backgroundColor: colors.ERROR_RED,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  errorRetryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    color: colors.ERROR_RED,
    marginTop: 4,
  },
  questionsHeader: {
    marginBottom: 12,
  },
  questionsHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.PRIMARY_BLUE,
  },
  questionsHeaderSub: {
    marginTop: 4,
    fontSize: 12,
    color: colors.TEXT_MEDIUM,
  },
  questionsLoadingWrap: {
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  questionsLoadingText: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
  },
  questionErrorCard: {
    backgroundColor: colors.ERROR_CARD_BG,
    borderWidth: 1,
    borderColor: colors.ERROR_CARD_BORDER,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  questionsList: {
    gap: 12,
  },
  questionCard: {
    borderWidth: 1,
    borderColor: colors.BORDER_GREY,
    borderRadius: 12,
    backgroundColor: colors.BACKGROUND_WHITE,
    padding: 12,
    gap: 8,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.TEXT_DARK,
    lineHeight: 20,
  },
  requiredMark: {
    color: colors.ACCENT_RED,
  },
  answerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  answerChip: {
    borderWidth: 1.5,
    borderColor: colors.BORDER_GREY,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.BACKGROUND_WHITE,
  },
  answerChipActive: {
    borderColor: colors.PRIMARY_BLUE,
    backgroundColor: colors.CHIP_ACTIVE_BG,
  },
  answerChipText: {
    fontSize: 13,
    color: colors.TEXT_DARK,
  },
  answerChipTextActive: {
    color: colors.PRIMARY_BLUE,
    fontWeight: '600',
  },
  warningCard: {
    backgroundColor: colors.WARNING_BG,
    borderRadius: 12,
    padding: 14,
  },
  warningInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.WARNING_TEXT,
    fontWeight: '500',
    lineHeight: 20,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.TEXT_MEDIUM,
  },
  gap20: { height: 20 },
  gap32: { height: 32 },
});

export default EmergencyAlertScreen;
