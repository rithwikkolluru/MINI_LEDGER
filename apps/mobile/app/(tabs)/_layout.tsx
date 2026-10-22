import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
export default function TabLayout() { return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: '#9AA59C', tabBarStyle: { height: 82, paddingTop: 10, paddingBottom: 20, borderTopColor: colors.line, backgroundColor: colors.paper }, tabBarLabelStyle: { fontSize: 11, fontWeight: '700' } }}><Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} /> }} /><Tabs.Screen name="loans" options={{ title: 'My loans', tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} /></Tabs>; }
