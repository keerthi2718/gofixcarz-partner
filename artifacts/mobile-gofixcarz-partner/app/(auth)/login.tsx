import { StyleSheet, Text, View } from 'react-native';

/**
 * Login screen — placeholder.
 * UI implementation coming in a future iteration.
 */
export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Login Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, color: '#666' },
});
