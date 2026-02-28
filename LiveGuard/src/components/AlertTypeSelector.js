import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ALERT_TYPE_OPTIONS = [
  { value: 'TERRORISM',     icon: 'bomb',          label: 'Terrorism',    color: '#7C3AED' },
  { value: 'BANDITRY',      icon: 'pistol',        label: 'Banditry',     color: '#DC2626' },
  { value: 'KIDNAPPING',    icon: 'account-alert', label: 'Kidnapping',   color: '#92400E' },
  { value: 'ARMED_ROBBERY', icon: 'knife',         label: 'Armed Robbery',color: '#DC2626' },
  { value: 'ROBBERY',       icon: 'cash',          label: 'Robbery',      color: '#D97706' },
  { value: 'FIRE_INCIDENCE',icon: 'fire',          label: 'Fire',         color: '#EF4444' },
  { value: 'ACCIDENT',      icon: 'car-off',       label: 'Accident',     color: '#F59E0B' },
  { value: 'OTHER',         icon: 'alert-circle',  label: 'Other',        color: '#6B7280' },
];

const AlertTypeSelector = ({ value, onChange }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
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
            <MaterialCommunityIcons
              name={opt.icon}
              size={28}
              color={selected ? opt.color : colors.TEXT_MEDIUM}
            />
            <Text style={[styles.label, selected && { color: opt.color }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
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
    gap: 8,
  },
  tileSelected: {
    borderColor: colors.PRIMARY_BLUE,
    backgroundColor: colors.CHIP_ACTIVE_BG,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
  },
});

export default AlertTypeSelector;
