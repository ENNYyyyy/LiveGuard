import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const InputField = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  leftIcon,
  rightIcon,
  onRightIconPress,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          ref={inputRef}
          style={[styles.input, leftIcon && styles.inputWithLeft, rightIcon && styles.inputWithRight]}
          placeholder={placeholder}
          placeholderTextColor={colors.PLACEHOLDER_GREY}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </Pressable>
      {error && (
        <Text style={styles.errorText}>
          {typeof error === 'string' ? error : "Please don't leave empty"}
        </Text>
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.LABEL_DARK,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.BACKGROUND_WHITE,
    borderWidth: 1.5,
    borderColor: colors.BORDER_GREY,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: colors.PRIMARY_BLUE,
    shadowColor: colors.PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: colors.ERROR_RED,
  },
  inputDisabled: {
    backgroundColor: colors.BORDER_GREY,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.TEXT_DARK,
    paddingVertical: 12,
  },
  inputWithLeft: {
    marginLeft: 8,
  },
  inputWithRight: {
    marginRight: 8,
  },
  leftIcon: {
    marginRight: 4,
  },
  rightIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 13,
    color: colors.ERROR_RED,
    marginTop: 4,
    marginLeft: 2,
  },
});

export default InputField;
