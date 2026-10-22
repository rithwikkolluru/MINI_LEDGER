import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from './db';

const secret = process.env.JWT_SECRET ?? '';
const phoneSchema = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Use a phone number with country code, such as +919876543210.');
export type AuthedRequest = Request & { userId?: string };
const digest = (value: string) => createHash('sha256').update(`${secret}:${value}`).digest('hex');

export function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !secret) return res.status(401).json({ error: 'unauthorized', message: 'Please sign in to continue.' });
  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string') throw new Error('Invalid subject');
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: 'Your session has expired. Please sign in again.' });
  }
}

export async function requestOtp(req: Request, res: Response) {
  const parsed = z.object({ phoneNumber: phoneSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation_error', message: parsed.error.issues[0]?.message });
  const phoneNumber = parsed.data.phoneNumber;
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await prisma.$transaction(async tx => {
    const now = new Date();
    await tx.otpChallenge.updateMany({ where: { phoneNumber, consumedAt: null }, data: { consumedAt: now } });
    await tx.otpChallenge.create({ data: { id: randomUUID(), phoneNumber, otpHash: digest(code), expiresAt: new Date(now.getTime() + 5 * 60_000) } });
  });
  if (process.env.NODE_ENV !== 'production') console.info(`[MiniLedger dev OTP] ${phoneNumber}: ${code}`);
  return res.status(202).json({ message: 'If this number can receive codes, a verification code has been sent.', expiresInSeconds: 300 });
}

export async function verifyOtp(req: Request, res: Response) {
  const parsed = z.object({ phoneNumber: phoneSchema, code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code.') }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation_error', message: parsed.error.issues[0]?.message });
  const { phoneNumber, code } = parsed.data;
  const result = await prisma.$transaction(async tx => {
    const [challenge] = await tx.$queryRaw<Array<{ id: string; otpHash: string; expiresAt: Date; attempts: number }>>`SELECT id, otp_hash AS otpHash, expires_at AS expiresAt, attempts FROM otp_challenges WHERE phone_number = ${phoneNumber} AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE`;
    if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= 5) return null;
    const expected = Buffer.from(challenge.otpHash);
    const actual = Buffer.from(digest(code));
    const valid = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!valid) {
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return null;
    }
    await tx.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    const user = await tx.user.upsert({ where: { phoneNumber }, create: { phoneNumber }, update: {} });
    return user;
  });
  if (!result) return res.status(401).json({ error: 'invalid_code', message: 'That code is invalid or expired. Request a new one and try again.' });
  const accessToken = jwt.sign({}, process.env.JWT_SECRET!, { subject: result.id, expiresIn: '7d' });
  return res.json({ accessToken, user: { id: result.id, phoneNumber: result.phoneNumber } });
}

export function logout(_req: Request, res: Response) {
  return res.status(204).send();
}
