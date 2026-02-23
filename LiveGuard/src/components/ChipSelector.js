import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import colors from '../utils/colors';

const ChipSelector = ({ label, options, selectedKey, onSelect, required }) => {
  return (
    <View>
      {label && (
        <Text style={styles.sectionLabel}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={styles.row}>
        {options.map((opt) => {
          const active = selectedKey === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(opt.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT_DARK,
    marginBottom: 10,
  },
  required: {
    color: colors.ACCENT_RED,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.BORDER_GREY,
    backgroundColor: colors.BACKGROUND_WHITE,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.PRIMARY_BLUE,
    backgroundColor: '#EFF6FF',
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.TEXT_DARK,
  },
  chipLabelActive: {
    color: colors.PRIMARY_BLUE,
  },
});

export default ChipSelector;
