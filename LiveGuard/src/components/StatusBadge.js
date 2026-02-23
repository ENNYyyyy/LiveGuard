import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../utils/colors';
import { ALERT_STATUSES } from '../utils/constants';

const StatusBadge = ({ status }) => {
  const key = status?.toUpperCase();
  const config = ALERT_STATUSES[key];
  const bg = key === 'RESOLVED' ? colors.STATUS_GREY : (config?.color || colors.STATUS_GREY);
  const label = config?.label || status;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.BACKGROUND_WHITE,
  },
});

export default StatusBadge;
