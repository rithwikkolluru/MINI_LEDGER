import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Loan, Summary } from './types';
const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const tokenKey = 'miniledger_access_token';
export async function saveToken(token: string) { if (Platform.OS === 'web') { localStorage.setItem(tokenKey, token); return; } await SecureStore.setItemAsync(tokenKey, token); }
export async function clearToken() { if (Platform.OS === 'web') { localStorage.removeItem(tokenKey); return; } await SecureStore.deleteItemAsync(tokenKey); }
export async function getToken() { if (Platform.OS === 'web') return localStorage.getItem(tokenKey); return SecureStore.getItemAsync(tokenKey); }
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || 'Could not connect. Please try again.'); }
  return response.status === 204 ? undefined as T : response.json();
}
export const api = {
  requestOtp: (phoneNumber: string) => request<{ message: string }>('/api/v1/auth/request-otp', { method: 'POST', body: JSON.stringify({ phoneNumber }) }),
  verifyOtp: (phoneNumber: string, code: string) => request<{ accessToken: string; user: { id: string; phoneNumber: string } }>('/api/v1/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phoneNumber, code }) }),
  summary: () => request<Summary>('/api/v1/summary'),
  loans: () => request<Loan[]>('/api/v1/loans'),
  loan: (id: string) => request<Loan>(`/api/v1/loans/${id}`),
  createLoan: (data: Record<string, unknown>) => request<Loan>('/api/v1/loans', { method: 'POST', body: JSON.stringify(data) }),
  updateLoan: (id: string, data: Record<string, unknown>) => request<Loan>(`/api/v1/loans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLoan: (id: string) => request<void>(`/api/v1/loans/${id}`, { method: 'DELETE' }),
  repayment: (id: string, data: Record<string, unknown>) => request(`/api/v1/loans/${id}/repayments`, { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/api/v1/auth/logout', { method: 'POST' })
};
export { base as apiBase };
