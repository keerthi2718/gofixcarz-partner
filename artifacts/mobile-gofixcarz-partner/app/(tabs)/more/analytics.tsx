/**
 * This screen has been consolidated into the main Analytics tab.
 * Any deep-link to /(tabs)/more/analytics is redirected there.
 */
import { Redirect } from 'expo-router';

export default function MoreAnalyticsRedirect() {
  return <Redirect href="/(tabs)/analytics" />;
}
