// app/_layout.tsx
// Root layout with ErrorBoundary to catch crashes app-wide

import 'react-native-reanimated'; // MUST be first import

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Loading screen while fonts load
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0891b2" />
      <Text style={styles.loadingText}>Loading FishDex...</Text>
    </View>
  );
}

// Global error handler for crash reporting
function handleGlobalError(error: Error, errorInfo: React.ErrorInfo) {
  // Log to console in development
  if (__DEV__) {
    console.error('Global error caught:', error.message);
  }

  // TODO: Send to your crash reporting service
  // Examples:
  //
  // Sentry:
  // import * as Sentry from '@sentry/react-native';
  // Sentry.captureException(error, {
  //   extra: { componentStack: errorInfo.componentStack }
  // });
  //
  // Firebase Crashlytics:
  // import crashlytics from '@react-native-firebase/crashlytics';
  // crashlytics().recordError(error);
  //
  // For now, we could store errors locally for later review:
  // AsyncStorage.setItem('@crash_log', JSON.stringify({
  //   error: error.message,
  //   stack: error.stack,
  //   componentStack: errorInfo.componentStack,
  //   timestamp: new Date().toISOString(),
  // }));
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Handle font loading error
  if (error) {
    console.error('Font loading error:', error);
    // Continue without custom font rather than crashing
  }

  // Show loading screen while fonts load
  if (!loaded && !error) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecfeff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#0e7490',
    fontWeight: '500',
  },
});
