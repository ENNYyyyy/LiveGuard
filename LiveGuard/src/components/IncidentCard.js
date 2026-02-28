import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from './StatusBadge';
import { getTimeAgo, truncateText } from '../utils/helpers';

const TYPE_ICONS = {
  FIRE_INCIDENCE: { name: 'fire',           color: '#EF4444', bg: '#FEE2E2' },
  ACCIDENT:       { name: 'car-off',        color: '#F59E0B', bg: '#FEF3C7' },
  TERRORISM:      { name: 'bomb',           color: '#7C3AED', bg: '#EDE9FE' },
  BANDITRY:       { name: 'pistol',         color: '#DC2626', bg: '#FEE2E2' },
  KIDNAPPING:     { name: 'account-alert',  color: '#92400E', bg: '#FEF3C7' },
  ARMED_ROBBERY:  { name: 'knife',          color: '#DC2626', bg: '#FEE2E2' },
  ROBBERY:        { name: 'cash',           color: '#D97706', bg: '#FFFBEB' },
  OTHER:          { name: 'alert-circle',   color: '#6B7280', bg: '#F3F4F6' },
};

const IncidentCard = ({ incident, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const icon = TYPE_ICONS[incident.alert_type] || TYPE_ICONS.OTHER;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Left: type icon */}
      <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
        <MaterialCommunityIcons name={icon.name} size={22} color={icon.color} />
      </View>

      {/* Center: timestamp + address */}
      <View style={styles.info}>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.TEXT_MEDIUM} />
          <Text style={styles.meta}>{getTimeAgo(incident.created_at)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.TEXT_MEDIUM} />
          <Text style={styles.meta}>{truncateText(incident.location?.address, 34)}</Text>
        </View>
      </View>

      {/* Right: badge + chevron */}
      <View style={styles.right}>
        <StatusBadge status={incident.status} />
        <Ionicons name="chevron-forward" size={18} color={colors.PLACEHOLDER_GREY} />
      </View>
    </TouchableOpacity>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.CARD_WHITE,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  meta: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
});

export default IncidentCard;
