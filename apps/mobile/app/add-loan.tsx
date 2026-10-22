import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../src/api';
import { colors } from '../src/theme';
import { Button, Field, localDate } from '../src/ui';
export default function AddLoan() {
  const [name, setName] = useState(''); const [amount, setAmount] = useState(''); const [loanDate, setLoanDate] = useState(localDate()); const [dueDate, setDueDate] = useState(localDate()); const [phone, setPhone] = useState(''); const [notes, setNotes] = useState(''); const [error, setError] = useState('');
  const qc = useQueryClient(); const mutation = useMutation({ mutationFn: api.createLoan, onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['loans'] }), qc.invalidateQueries({ queryKey: ['summary'] })]); router.replace('/(tabs)/loans'); }, onError: (e: Error) => setError(e.message) });
  const submit = () => { setError(''); if (!name.trim()) return setError('Add your friend’s name.'); if (!amount || Number(amount) <= 0) return setError('Enter an amount greater than zero.'); if (!/^\d{4}-\d{2}-\d{2}$/.test(loanDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return setError('Dates need the format YYYY-MM-DD.'); if (dueDate < loanDate) return setError('The due date can’t come before the loan date.'); mutation.mutate({ friendName: name.trim(), amount: Number(amount).toFixed(2), loanDate, dueDate, friendPhone: phone.trim() || null, notes: notes.trim() || null }); };
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={{ padding: 22, paddingTop: 55, paddingBottom: 36, gap: 16 }} keyboardShouldPersistTaps="handled"><Pressable onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }}><Ionicons name="arrow-back" size={20} color={colors.ink} /></Pressable><View style={{ marginBottom: 4 }}><Text style={{ color: colors.green, fontSize: 11, letterSpacing: 1.5, fontWeight: '800' }}>NEW RECORD</Text><Text style={{ color: colors.ink, fontSize: 29, fontWeight: '800', marginTop: 5 }}>Add a loan</Text><Text style={{ color: colors.muted, fontSize: 14, marginTop: 5 }}>A simple note today makes things clearer later.</Text></View>
    <Field label="Friend’s full name" value={name} onChangeText={setName} placeholder="e.g. Aanya Mehta" autoCapitalize="words" />
    <Field label="Amount lent · INR" value={amount} onChangeText={v => setAmount(v.replace(/[^\d.]/g, ''))} placeholder="0.00" keyboardType="decimal-pad" />
    <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Lent on" value={loanDate} onChangeText={setLoanDate} placeholder="YYYY-MM-DD" /></View><View style={{ flex: 1 }}><Field label="Due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" /></View></View>
    <Field label="Phone number · optional" value={phone} onChangeText={setPhone} placeholder="Friend’s number" keyboardType="phone-pad" />
    <Field label="A note · optional" value={notes} onChangeText={setNotes} placeholder="What was it for?" multiline />
    {!!error && <Text style={{ color: colors.coral, fontSize: 13, lineHeight: 19 }}>{error}</Text>}
    <Button title="Save this loan" icon="checkmark" onPress={submit} disabled={mutation.isPending} />
  </ScrollView></KeyboardAvoidingView>;
}
