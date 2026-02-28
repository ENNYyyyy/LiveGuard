import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const StatusTimeline = ({ steps = [] }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <View key={index} style={styles.row}>
            <View style={styles.left}>
              <View style={[styles.circle, step.completed && styles.circleCompleted]}>
                {step.completed && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
              </View>
              {!isLast && <View style={[styles.line, step.completed && styles.lineCompleted]} />}
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>{step.label}</Text>
              {step.time && <Text style={styles.time}>{step.time}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  left: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.BORDER_GREY,
    backgroundColor: colors.BACKGROUND_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: colors.PRIMARY_BLUE,
    borderColor: colors.PRIMARY_BLUE,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: colors.BORDER_GREY,
    marginVertical: 2,
  },
  lineCompleted: {
    backgroundColor: colors.PRIMARY_BLUE,
  },
  content: {
    flex: 1,
    paddingBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT_DARK,
  },
  time: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.TEXT_MEDIUM,
    marginTop: 2,
  },
});

export default StatusTimeline;
