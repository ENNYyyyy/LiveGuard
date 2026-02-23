import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../utils/colors';

const ALERT_TYPE_OPTIONS = [
  { value: 'TERRORISM',     icon: '💣', label: 'Terrorism' },
  { value: 'BANDITRY',      icon: '🔫', label: 'Banditry' },
  { value: 'KIDNAPPING',    icon: '🚨', label: 'Kidnapping' },
  { value: 'ARMED_ROBBERY', icon: '🗡️', label: 'Armed Robbery' },
  { value: 'ROBBERY',       icon: '💰', label: 'Robbery' },
  { value: 'FIRE_INCIDENCE',icon: '🔥', label: 'Fire' },
  { value: 'ACCIDENT',      icon: '🚗', label: 'Accident' },
  { value: 'OTHER',         icon: '⚠️', label: 'Other' },
];

const AlertTypeSelector = ({ value, onChange }) => (
  <View style={styles.grid}>
    {ALERT_TYPE_OPTIONS.map((opt) => {
      const selected = value === opt.value;
      return (
        <TouchableOpacity
          key={opt.value}
          style={[styles.tile, selected && styles.tileSelected]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.75}
        >
          <Text style={styles.icon}>{opt.icon}</Text>
          <Text style={[styles.label, selected && styles.labelSelected]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '47%',
    backgroundColor: colors.BACKGROUND_WHITE,
    borderWidth: 1.5,
    borderColor: colors.BORDER_GREY,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  tileSelected: {
    borderColor: colors.PRIMARY_BLUE,
    backgroundColor: '#EFF6FF',
  },
  icon: {
    fontSize: 26,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.PRIMARY_BLUE,
  },
});

export default AlertTypeSelector;
