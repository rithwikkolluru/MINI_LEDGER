import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, saveToken } from '../src/api';
import { useAuth } from '../src/auth-context';
import { colors } from '../src/theme';
import { Button, Field } from '../src/ui';
export default function Verify() {
  const { phone = '' } = useLocalSearchParams<{ phone: string }>(); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const { setSignedIn } = useAuth();
  const verify = async () => { setBusy(true); try { const result = await api.verifyOtp(String(phone), code); await saveToken(result.accessToken); setSignedIn(true); router.replace('/(tabs)'); } catch (e: any) { Alert.alert('Unable to verify', e.message); } finally { setBusy(false); } };
  const resend = async () => { try { await api.requestOtp(String(phone)); Alert.alert('Code sent', 'Check the API terminal for the development code.'); } catch (e: any) { Alert.alert('Could not resend', e.message); } };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg, padding: 25, paddingTop: 70 }}><Pressable onPress={() => router.back()} style={{ height: 42, width: 42, borderRadius: 14, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 42 }}><Ionicons name="arrow-back" size={20} color={colors.ink} /></Pressable><Text style={{ color: colors.green, fontSize: 12, fontWeight: '800', letterSpacing: 2 }}>VERIFY YOUR NUMBER</Text><Text style={{ color: colors.ink, fontSize: 32, fontWeight: '800', marginTop: 12 }}>One small check.</Text><Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 10, marginBottom: 30 }}>Enter the six-digit code for {phone}.</Text><Field label="Verification code" value={code} onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="••••••" maxLength={6} /><View style={{ marginTop: 18 }}><Button title="Verify and continue" onPress={verify} disabled={busy || code.length !== 6} /></View><Pressable onPress={resend} style={{ padding: 18, alignItems: 'center' }}><Text style={{ color: colors.green, fontWeight: '700' }}>Resend code</Text></Pressable><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 20 }}>Development note: the mock code is printed in the API terminal. SMS delivery must be configured before production use.</Text></KeyboardAvoidingView>;
}
