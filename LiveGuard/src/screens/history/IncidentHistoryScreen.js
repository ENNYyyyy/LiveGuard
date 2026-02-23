import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAlertHistory } from '../../store/alertSlice';
import IncidentCard from '../../components/IncidentCard';
import NoInternetBanner from '../../components/NoInternetBanner';
import useNetInfo from '../../hooks/useNetInfo';
import colors from '../../utils/colors';

const IncidentHistoryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { alertHistory, loading, error } = useSelector((state) => state.alert);
  const { isConnected } = useNetInfo();

  const doFetch = () => dispatch(fetchAlertHistory());

  useEffect(() => {
    doFetch();
  }, []);

  // Show API error state with retry (only when list is empty to avoid covering existing data)
  if (error && !loading && alertHistory.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <NoInternetBanner visible={!isConnected} />
        <View style={[styles.header, !isConnected && styles.headerOffsetForBanner]}>
          <Text style={styles.headerTitle}>Incident History</Text>
        </View>
        <TouchableOpacity style={styles.errorContainer} onPress={doFetch} activeOpacity={0.75}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to load history.</Text>
          <Text style={styles.errorSub}>Tap to retry.</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No incidents recorded yet.</Text>
      <Text style={styles.emptySubtext}>
        Your emergency alerts will appear here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Offline banner */}
      <NoInternetBanner visible={!isConnected} />

      <View style={[styles.header, !isConnected && styles.headerOffsetForBanner]}>
        <Text style={styles.headerTitle}>Incident History</Text>
      </View>

      {loading && alertHistory.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.PRIMARY_BLUE} />
        </View>
      ) : (
        <FlatList
          data={alertHistory}
          keyExtractor={(item) => String(item.alert_id)}
          renderItem={({ item }) => (
            <IncidentCard
              incident={item}
              onPress={() => navigation.navigate('AlertStatusScreen', { alertId: item.alert_id })}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.BACKGROUND_LIGHT },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_GREY,
  },
  headerOffsetForBanner: {
    marginTop: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.TEXT_DARK,
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
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 56,
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
  // Error/retry state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
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
