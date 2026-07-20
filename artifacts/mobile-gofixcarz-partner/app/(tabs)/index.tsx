import { StyleSheet, Text, View } from 'react-native';

/**
 * Dashboard screen — placeholder.
 * UI implementation coming in a future iteration.
 */
export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>GoFixCarz Partner</Text>
      <Text style={styles.subtitle}>Garage Owner Dashboard — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
