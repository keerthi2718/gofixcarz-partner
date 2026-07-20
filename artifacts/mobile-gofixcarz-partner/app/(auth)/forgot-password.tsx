import { StyleSheet, Text, View } from 'react-native';

/**
 * Forgot Password screen — placeholder.
 */
export default function ForgotPasswordScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Forgot Password Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, color: '#666' },
});
