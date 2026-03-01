import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchAlertHistory } from '../../store/alertSlice';
import IncidentCard from '../../components/IncidentCard';
import { SkeletonIncidentCard } from '../../components/SkeletonCard';
import NoInternetBanner from '../../components/NoInternetBanner';
import useNetInfo from '../../hooks/useNetInfo';
import { useTheme } from '../../context/ThemeContext';

// ── Constants ──────────────────────────────────────────────────────────────────
const ALERT_TYPE_OPTIONS = [
  { key: 'TERRORISM',     label: 'Terrorism' },
  { key: 'BANDITRY',      label: 'Banditry' },
  { key: 'KIDNAPPING',    label: 'Kidnapping' },
  { key: 'ARMED_ROBBERY', label: 'Armed Robbery' },
  { key: 'ROBBERY',       label: 'Robbery' },
  { key: 'FIRE_INCIDENCE',label: 'Fire' },
  { key: 'ACCIDENT',      label: 'Accident' },
  { key: 'OTHER',         label: 'Other' },
];

const STATUS_OPTIONS = [
  { key: 'PENDING',      label: 'Pending' },
  { key: 'DISPATCHED',   label: 'Dispatched' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { key: 'RESPONDING',   label: 'En Route' },
  { key: 'RESOLVED',     label: 'Resolved' },
  { key: 'CANCELLED',    label: 'Cancelled' },
];

// ── Picker modal (bottom sheet) ────────────────────────────────────────────────
const PickerModal = ({ visible, title, options, selectedKey, onSelect, onClose, colors }) => (
  <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <Pressable style={pickerStyles.overlay} onPress={onClose}>
      <Pressable style={[pickerStyles.sheet, { backgroundColor: colors.CARD_WHITE }]}>
        <View style={[pickerStyles.handle, { backgroundColor: colors.BORDER_GREY }]} />
        <Text style={[pickerStyles.title, { color: colors.TEXT_DARK }]}>{title}</Text>
        {options.map((opt) => (
          <TouchableOpacity
            key={String(opt.key)}
            style={[pickerStyles.row, { borderBottomColor: colors.BORDER_GREY }]}
            onPress={() => { onSelect(opt.key); onClose(); }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                pickerStyles.rowText,
                { color: opt.key === selectedKey ? colors.PRIMARY_BLUE : colors.TEXT_DARK },
              ]}
            >
              {opt.label}
            </Text>
            {opt.key === selectedKey && (
              <Ionicons name="checkmark" size={18} color={colors.PRIMARY_BLUE} />
            )}
          </TouchableOpacity>
        ))}
      </Pressable>
    </Pressable>
  </Modal>
);

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

// ── Dropdown button ────────────────────────────────────────────────────────────
const DropBtn = ({ label, active, onPress, colors }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{
      flex: 1,
      height: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: 10,
      backgroundColor: active ? colors.PRIMARY_BLUE : colors.CARD_WHITE,
      borderWidth: 1.5,
      borderColor: active ? colors.PRIMARY_BLUE : colors.BORDER_GREY,
    }}
  >
    <Text
      numberOfLines={1}
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: active ? '#FFFFFF' : colors.TEXT_MEDIUM,
        flexShrink: 1,
      }}
    >
      {label}
    </Text>
    <Ionicons
      name="chevron-down"
      size={12}
      color={active ? '#FFFFFF' : colors.TEXT_MEDIUM}
    />
  </TouchableOpacity>
);

// ── Stat item (tappable quick filter) ─────────────────────────────────────────
const StatItem = ({ label, value, onPress, active, colors }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={{ flex: 1, alignItems: 'center', gap: 2 }}
  >
    <Text
      style={{
        fontSize: 22,
        fontWeight: '800',
        color: active ? colors.PRIMARY_BLUE : colors.TEXT_DARK,
      }}
    >
      {value}
    </Text>
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        color: active ? colors.PRIMARY_BLUE : colors.TEXT_MEDIUM,
      }}
    >
      {label}
    </Text>
    <View
      style={{
        height: 3,
        width: 20,
        borderRadius: 2,
        backgroundColor: active ? colors.PRIMARY_BLUE : 'transparent',
        marginTop: 1,
      }}
    />
  </TouchableOpacity>
);

// ── Screen ─────────────────────────────────────────────────────────────────────
const IncidentHistoryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { alertHistory, loading, historyError } = useSelector((state) => state.alert);
  const { isConnected } = useNetInfo();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth]   = useState(null); // month key string
  const [selectedType, setSelectedType]     = useState(null); // alert_type string
  const [selectedStatus, setSelectedStatus] = useState(null); // status string
  const [showMonthPicker, setShowMonthPicker]   = useState(false);
  const [showTypePicker, setShowTypePicker]     = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const doFetch = useCallback(() => dispatch(fetchAlertHistory()), [dispatch]);

  useFocusEffect(useCallback(() => { doFetch(); }, [doFetch]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await dispatch(fetchAlertHistory()).unwrap(); }
    finally { setRefreshing(false); }
  }, [dispatch]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const now = new Date();
  const totalAlerts = alertHistory.length;

  const thisMonthAlerts = useMemo(
    () =>
      alertHistory.filter((a) => {
        const d = new Date(a.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    [alertHistory]
  );

  const resolvedAlerts = useMemo(
    () => alertHistory.filter((a) => a.status === 'RESOLVED').length,
    [alertHistory]
  );

  // ── Month options ──────────────────────────────────────────────────────────
  const months = useMemo(() => {
    const seen = new Set();
    const result = [];
    [...alertHistory]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .forEach((a) => {
        const d = new Date(a.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({
            key,
            label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
            year: d.getFullYear(),
            month: d.getMonth(),
          });
        }
      });
    return result;
  }, [alertHistory]);

  const monthPickerOptions = useMemo(
    () => [{ key: null, label: 'All Months' }, ...months],
    [months]
  );

  // ── Type options (only types present in history) ───────────────────────────
  const typePickerOptions = useMemo(() => {
    const used = new Set(alertHistory.map((a) => a.alert_type));
    return [
      { key: null, label: 'All Types' },
      ...ALERT_TYPE_OPTIONS.filter((o) => used.has(o.key)),
    ];
  }, [alertHistory]);

  const statusPickerOptions = [{ key: null, label: 'All Statuses' }, ...STATUS_OPTIONS];

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      alertHistory
        .filter((a) => {
          const d = new Date(a.created_at);
          const mKey = `${d.getFullYear()}-${d.getMonth()}`;
          return (
            (!selectedMonth || mKey === selectedMonth) &&
            (!selectedType   || a.alert_type === selectedType) &&
            (!selectedStatus || a.status === selectedStatus)
          );
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [alertHistory, selectedMonth, selectedType, selectedStatus]
  );

  const hasFilters = selectedMonth || selectedType || selectedStatus;

  // ── Label helpers ──────────────────────────────────────────────────────────
  const monthLabel   = selectedMonth  ? months.find((m) => m.key === selectedMonth)?.label : null;
  const typeLabel    = selectedType   ? ALERT_TYPE_OPTIONS.find((o) => o.key === selectedType)?.label : null;
  const statusLabel  = selectedStatus ? STATUS_OPTIONS.find((o) => o.key === selectedStatus)?.label : null;

  // ── Current-month key (for stats quick-filter) ─────────────────────────────
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const currentMonthExists = months.some((m) => m.key === currentMonthKey);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const clearAll = () => { setSelectedMonth(null); setSelectedType(null); setSelectedStatus(null); };

  const handleStatThisMonth = () =>
    setSelectedMonth((prev) =>
      prev === currentMonthKey || !currentMonthExists ? null : currentMonthKey
    );

  const handleStatResolved = () =>
    setSelectedStatus((prev) => (prev === 'RESOLVED' ? null : 'RESOLVED'));

  // ── Error state ────────────────────────────────────────────────────────────
  if (historyError && !loading && alertHistory.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <NoInternetBanner visible={!isConnected} />
        <View style={[styles.header, !isConnected && styles.headerOffsetForBanner]}>
          <Text style={styles.headerTitle}>Incident History</Text>
        </View>
        <TouchableOpacity style={styles.errorContainer} onPress={doFetch} activeOpacity={0.75}>
          <Ionicons name="warning-outline" size={40} color={colors.ERROR_RED} style={styles.errorIcon} />
          <Text style={styles.errorTitle}>Unable to load history.</Text>
          <Text style={styles.errorSub}>Tap to retry.</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={hasFilters ? 'search-outline' : 'document-text-outline'}
        size={56}
        color={colors.BORDER_GREY}
      />
      <Text style={styles.emptyTitle}>
        {hasFilters ? 'No matching incidents.' : 'No incidents recorded yet.'}
      </Text>
      <Text style={styles.emptySubtext}>
        {hasFilters
          ? 'Try adjusting the filters above.'
          : 'Your emergency alerts will appear here.'}
      </Text>
      {hasFilters && (
        <TouchableOpacity onPress={clearAll} style={styles.clearFiltersBtn}>
          <Text style={styles.clearFiltersText}>Clear filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <NoInternetBanner visible={!isConnected} />

      <View style={[styles.header, !isConnected && styles.headerOffsetForBanner]}>
        <Text style={styles.headerTitle}>Incident History</Text>
      </View>

      {loading && alertHistory.length === 0 ? (
        <View style={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => <SkeletonIncidentCard key={i} />)}
        </View>
      ) : (
        <>
          {/* Stats banner */}
          {totalAlerts > 0 && (
            <View style={styles.statsBanner}>
              <StatItem
                label="Total"
                value={totalAlerts}
                active={!hasFilters}
                onPress={clearAll}
                colors={colors}
              />
              <View style={styles.statsDivider} />
              <StatItem
                label="This Month"
                value={thisMonthAlerts}
                active={selectedMonth === currentMonthKey}
                onPress={handleStatThisMonth}
                colors={colors}
              />
              <View style={styles.statsDivider} />
              <StatItem
                label="Resolved"
                value={resolvedAlerts}
                active={selectedStatus === 'RESOLVED'}
                onPress={handleStatResolved}
                colors={colors}
              />
            </View>
          )}

          {/* Filter bar — 3 dropdown buttons */}
          {totalAlerts > 0 && (
            <View style={styles.filterBar}>
              <DropBtn
                label={monthLabel || 'Month'}
                active={!!selectedMonth}
                onPress={() => setShowMonthPicker(true)}
                colors={colors}
              />
              <DropBtn
                label={typeLabel || 'Type'}
                active={!!selectedType}
                onPress={() => setShowTypePicker(true)}
                colors={colors}
              />
              <DropBtn
                label={statusLabel || 'Status'}
                active={!!selectedStatus}
                onPress={() => setShowStatusPicker(true)}
                colors={colors}
              />
            </View>
          )}

          {/* Results count */}
          {hasFilters && (
            <Text style={styles.resultsCount}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </Text>
          )}

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.alert_id)}
            renderItem={({ item }) => (
              <IncidentCard
                incident={item}
                onPress={() =>
                  navigation.navigate('AlertStatusScreen', { alertId: item.alert_id })
                }
              />
            )}
            contentContainerStyle={styles.list}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </>
      )}

      {/* Picker modals */}
      <PickerModal
        visible={showMonthPicker}
        title="Filter by Month"
        options={monthPickerOptions}
        selectedKey={selectedMonth}
        onSelect={setSelectedMonth}
        onClose={() => setShowMonthPicker(false)}
        colors={colors}
      />
      <PickerModal
        visible={showTypePicker}
        title="Filter by Type"
        options={typePickerOptions}
        selectedKey={selectedType}
        onSelect={setSelectedType}
        onClose={() => setShowTypePicker(false)}
        colors={colors}
      />
      <PickerModal
        visible={showStatusPicker}
        title="Filter by Status"
        options={statusPickerOptions}
        selectedKey={selectedStatus}
        onSelect={setSelectedStatus}
        onClose={() => setShowStatusPicker(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.BACKGROUND_LIGHT },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_GREY,
  },
  headerOffsetForBanner: { marginTop: 44 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.TEXT_DARK,
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.CARD_WHITE,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    height: 72,
    overflow: 'hidden',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statsDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.BORDER_GREY,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 2,
  },
  resultsCount: {
    fontSize: 12,
    color: colors.TEXT_MEDIUM,
    paddingHorizontal: 20,
    marginTop: 6,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.TEXT_DARK,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  clearFiltersBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: colors.PRIMARY_BLUE,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  errorIcon: { fontSize: 48, marginBottom: 4 },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.TEXT_DARK,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 14,
    color: colors.PRIMARY_BLUE,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default IncidentHistoryScreen;
