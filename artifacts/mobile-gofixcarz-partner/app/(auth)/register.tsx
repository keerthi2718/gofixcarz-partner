import { StyleSheet, Text, View } from 'react-native';

/**
 * Register screen — placeholder.
 */
export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Register Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, color: '#666' },
});
