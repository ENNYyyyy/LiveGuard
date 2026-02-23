import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../utils/colors';

/**
 * Displays acknowledgment details for an alert assignment.
 * Props:
 *   acknowledgment — { acknowledged_by, estimated_arrival, response_message, responder_contact }
 *   agencyName     — string
 */
const AcknowledgmentCard = ({ acknowledgment, agencyName }) => {
  if (!acknowledgment) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Acknowledged</Text>

      <Row label="Agency" value={agencyName} />
      <Row label="Officer" value={acknowledgment.acknowledged_by} />
      {acknowledgment.estimated_arrival != null && (
        <Row label="ETA" value={`${acknowledgment.estimated_arrival} min`} />
      )}
      {acknowledgment.response_message ? (
        <Row label="Message" value={acknowledgment.response_message} />
      ) : null}
      {acknowledgment.responder_contact ? (
        <Row label="Contact" value={acknowledgment.responder_contact} />
      ) : null}
    </View>
  );
};

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.BACKGROUND_WHITE,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.SUCCESS_GREEN,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.SUCCESS_GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
    fontWeight: '500',
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: colors.TEXT_DARK,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
});

export default AcknowledgmentCard;
