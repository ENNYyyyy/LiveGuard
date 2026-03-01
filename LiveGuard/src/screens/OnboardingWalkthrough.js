import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { STORAGE_KEYS } from '../utils/constants';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    icon: (color) => <MaterialCommunityIcons name="shield-alert" size={80} color={color} />,
    title: 'One Tap SOS',
    subtitle: 'Press the SOS button to instantly alert emergency services with your location. Help arrives faster when every second counts.',
  },
  {
    key: '2',
    icon: (color) => <Ionicons name="location" size={80} color={color} />,
    title: 'Live Location Tracking',
    subtitle: 'Your location is shared in real time with responders as soon as you send an alert. No need to describe where you are.',
  },
  {
    key: '3',
    icon: (color) => <Ionicons name="people" size={80} color={color} />,
    title: 'Emergency Contacts',
    subtitle: 'Add up to 3 trusted contacts. They get an SMS with your location the moment you send an SOS — keeping your loved ones in the loop.',
  },
];

const OnboardingWalkthrough = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const flatRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleDone = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');
    navigation.replace('OnboardingScreen');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleDone();
    }
  };

  const handleSkip = () => handleDone();

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconCircle}>
              {item.icon(colors.PRIMARY_BLUE)}
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 22, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.35, 1, 0.35],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.PRIMARY_BLUE }]}
            />
          );
        })}
      </View>

      {/* Next / Get Started */}
      <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
        <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_WHITE,
    alignItems: 'center',
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.TEXT_MEDIUM,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.CHIP_ACTIVE_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.TEXT_DARK,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 40,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.PRIMARY_BLUE,
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 40,
    minWidth: 200,
  },
  nextText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSpacer: { height: 24 },
});

export default OnboardingWalkthrough;
