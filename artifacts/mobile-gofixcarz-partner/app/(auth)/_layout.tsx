import { Stack } from 'expo-router';

/**
 * Auth stack — login, register, forgot/reset password.
 * No tab bar; header hidden so screens control their own chrome.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
