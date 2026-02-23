import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../utils/colors';

const StatusTimeline = ({ steps = [] }) => {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <View key={index} style={styles.row}>
            {/* Left column: circle + connecting line */}
            <View style={styles.left}>
              <View style={[styles.circle, step.completed && styles.circleCompleted]}>
                {step.completed && <Text style={styles.check}>✓</Text>}
              </View>
              {!isLast && <View style={[styles.line, step.completed && styles.lineCompleted]} />}
            </View>
            {/* Right column: label + time */}
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

const styles = StyleSheet.create({
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
  check: {
    color: colors.BACKGROUND_WHITE,
    fontSize: 11,
    fontWeight: '700',
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
