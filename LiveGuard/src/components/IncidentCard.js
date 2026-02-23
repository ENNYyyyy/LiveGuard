import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../utils/colors';
import StatusBadge from './StatusBadge';
import { INCIDENT_TYPE_ICONS } from '../utils/constants';
import { getTimeAgo, truncateText } from '../utils/helpers';

const TYPE_EMOJIS = {
  FIRE_INCIDENCE: '🔥',
  ACCIDENT:       '🚑',
  ROBBERY:        '🛡️',
  KIDNAPPING:     '⚠️',
};

const IncidentCard = ({ incident, onPress }) => {
  const typeConfig = INCIDENT_TYPE_ICONS[incident.alert_type] || { bgColor: colors.STATUS_GREY };
  const emoji = TYPE_EMOJIS[incident.alert_type] || '⚠️';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Left: type icon */}
      <View style={[styles.iconBox, { backgroundColor: typeConfig.bgColor }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* Center: timestamp + address */}
      <View style={styles.info}>
        <Text style={styles.meta}>🕐 {getTimeAgo(incident.created_at)}</Text>
        <Text style={styles.meta}>📍 {truncateText(incident.location?.address, 36)}</Text>
      </View>

      {/* Right: badge + chevron */}
      <View style={styles.right}>
        <StatusBadge status={incident.status} />
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.BACKGROUND_WHITE,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  meta: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  chevron: {
    fontSize: 20,
    color: colors.PLACEHOLDER_GREY,
  },
});

export default IncidentCard;
