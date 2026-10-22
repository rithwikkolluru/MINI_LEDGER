import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import openapi from '../openapi.json';
import { isOverdue, loanTotals, summaryTotals } from './ledger';
import { authenticate, AuthedRequest, logout, requestOtp, verifyOtp } from './auth';
import { prisma } from './db';

const app = express();
const port = Number(process.env.PORT || 4000);
const phoneLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const corsOrigins = process.env.CLIENT_ORIGIN?.split(',').map(origin => origin.trim()).filter(Boolean);
app.use(helmet());
app.use(cors({ origin: corsOrigins?.length ? (origin, callback) => callback(null, !origin || corsOrigins.includes(origin)) : process.env.NODE_ENV !== 'production' }));
app.use(express.json({ limit: '100kb' }));
app.use(pinoHttp({ redact: ['req.headers.authorization', 'req.body.code'] }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/api/v1/auth/request-otp', phoneLimiter, requestOtp);
app.post('/api/v1/auth/verify-otp', phoneLimiter, verifyOtp);
app.post('/api/v1/auth/logout', authenticate, logout);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));

const loanInput = z.object({ friendName: z.string().trim().min(1).max(160), friendPhone: z.string().trim().max(32).optional().nullable().refine(v => !v || /^\+?[0-9\s().-]{7,20}$/.test(v), 'Enter a valid phone number.'), amount: z.string().regex(/^\d{1,11}(\.\d{1,2})?$/), loanDate: z.string().date(), dueDate: z.string().date(), notes: z.string().trim().max(5000).optional().nullable() }).refine(x => Number(x.amount) > 0, { path: ['amount'], message: 'Amount must be greater than zero.' }).refine(x => x.dueDate >= x.loanDate, { path: ['dueDate'], message: 'Due date cannot be before the loan date.' });
const repaymentInput = z.object({ amount: z.string().regex(/^\d{1,11}(\.\d{1,2})?$/), repaymentDate: z.string().date(), note: z.string().trim().max(1000).optional() }).refine(x => Number(x.amount) > 0, { path: ['amount'], message: 'Repayment must be greater than zero.' });
const dateOnly = (s: string) => new Date(`${s}T00:00:00.000Z`);
const routeId = (req: express.Request) => { const value = req.params.id; return Array.isArray(value) ? value[0] : value; };
const calendarDate = (date: Date, timezone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const serializeLoan = (loan: any) => {
  const { lent: amount, repaid, outstanding } = loanTotals(loan.originalAmount, loan.repayments.map((row: any) => row.amount));
  const dueDate = calendarDate(loan.dueDate, 'UTC');
  const today = calendarDate(new Date(), loan.user?.timezone || 'Asia/Kolkata');
  const overdue = isOverdue(outstanding, dueDate, today);
  return { id: loan.id, friendName: loan.friendName, friendPhone: loan.friendPhone, originalAmount: amount.toFixed(2), totalRepaid: repaid.toFixed(2), outstanding: outstanding.toFixed(2), loanDate: calendarDate(loan.loanDate, 'UTC'), dueDate, notes: loan.notes, status: outstanding.isZero() ? 'repaid' : overdue ? 'overdue' : 'outstanding', repayments: loan.repayments.map((r: any) => ({ id: r.id, amount: new Prisma.Decimal(r.amount).toFixed(2), repaymentDate: calendarDate(r.repaymentDate, 'UTC'), note: r.note })) };
};
const includeRepayments = { repayments: { orderBy: [{ repaymentDate: 'desc' as const }, { createdAt: 'desc' as const }] }, user: { select: { timezone: true } } };

app.get('/api/v1/summary', authenticate, async (req: AuthedRequest, res) => {
  const loans = await prisma.loan.findMany({ where: { userId: req.userId }, include: includeRepayments });
  const rows = loans.map(serializeLoan);
  const totals = summaryTotals(rows.map(row => ({ lent: row.originalAmount, repaid: row.totalRepaid, outstanding: row.outstanding, overdue: row.status === 'overdue', status: row.status })));
  res.json({ currency: 'INR', ...totals });
});

app.get('/api/v1/loans', authenticate, async (req: AuthedRequest, res) => {
  const loans = await prisma.loan.findMany({ where: { userId: req.userId }, include: includeRepayments, orderBy: { createdAt: 'desc' } });
  res.json(loans.map(serializeLoan));
});
app.post('/api/v1/loans', authenticate, async (req: AuthedRequest, res) => {
  const parsed = loanInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation_error', message: parsed.error.issues[0].message });
  const d = parsed.data;
  const loan = await prisma.loan.create({ data: { userId: req.userId!, friendName: d.friendName, friendPhone: d.friendPhone || null, originalAmount: d.amount, loanDate: dateOnly(d.loanDate), dueDate: dateOnly(d.dueDate), notes: d.notes || null }, include: includeRepayments });
  res.status(201).json(serializeLoan(loan));
});
app.get('/api/v1/loans/:id', authenticate, async (req: AuthedRequest, res) => {
  const loan = await prisma.loan.findFirst({ where: { id: routeId(req), userId: req.userId }, include: includeRepayments });
  if (!loan) return res.status(404).json({ error: 'not_found', message: 'Loan not found.' });
  res.json(serializeLoan(loan));
});
app.patch('/api/v1/loans/:id', authenticate, async (req: AuthedRequest, res) => {
  const parsed = loanInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation_error', message: parsed.error.issues[0].message });
  const d = parsed.data;
  const updated = await prisma.$transaction(async tx => {
    const current = await tx.loan.findFirst({ where: { id: routeId(req), userId: req.userId }, select: { id: true } });
    if (!current) return 'missing' as const;
    await tx.$queryRaw`SELECT id FROM loans WHERE id = ${current.id} FOR UPDATE`;
    const total = await tx.repayment.aggregate({ where: { loanId: current.id }, _sum: { amount: true } });
    if (new Prisma.Decimal(d.amount).lessThan(total._sum.amount ?? 0)) return 'below_repaid' as const;
    await tx.loan.update({ where: { id: current.id }, data: { friendName: d.friendName, friendPhone: d.friendPhone || null, originalAmount: d.amount, loanDate: dateOnly(d.loanDate), dueDate: dateOnly(d.dueDate), notes: d.notes || null } });
    return current.id;
  });
  if (updated === 'missing') return res.status(404).json({ error: 'not_found', message: 'Loan not found.' });
  if (updated === 'below_repaid') return res.status(409).json({ error: 'amount_below_repaid', message: 'Original amount cannot be less than repayments already recorded.' });
  const loan = await prisma.loan.findUnique({ where: { id: routeId(req) }, include: includeRepayments });
  res.json(serializeLoan(loan));
});
app.delete('/api/v1/loans/:id', authenticate, async (req: AuthedRequest, res) => {
  const loan = await prisma.loan.findFirst({ where: { id: routeId(req), userId: req.userId }, include: { repayments: { select: { id: true } } } });
  if (!loan) return res.status(404).json({ error: 'not_found', message: 'Loan not found.' });
  if (loan.repayments.length) return res.status(409).json({ error: 'has_repayments', message: 'Loans with repayment history cannot be deleted.' });
  await prisma.loan.delete({ where: { id: loan.id } });
  res.status(204).send();
});
app.get('/api/v1/loans/:id/repayments', authenticate, async (req: AuthedRequest, res) => {
  const loan = await prisma.loan.findFirst({ where: { id: routeId(req), userId: req.userId } });
  if (!loan) return res.status(404).json({ error: 'not_found', message: 'Loan not found.' });
  const repayments = await prisma.repayment.findMany({ where: { loanId: loan.id }, orderBy: [{ repaymentDate: 'desc' }, { createdAt: 'desc' }] });
  res.json(repayments.map(r => ({ id: r.id, amount: String(r.amount), repaymentDate: r.repaymentDate.toISOString().slice(0, 10), note: r.note })));
});
app.post('/api/v1/loans/:id/repayments', authenticate, async (req: AuthedRequest, res) => {
  const parsed = repaymentInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation_error', message: parsed.error.issues[0].message });
  try {
    const created = await prisma.$transaction(async tx => {
      const owned = await tx.loan.findFirst({ where: { id: routeId(req), userId: req.userId }, select: { id: true } });
      if (!owned) throw Object.assign(new Error('Loan not found.'), { status: 404 });
      await tx.$queryRaw`SELECT id FROM loans WHERE id = ${owned.id} FOR UPDATE`;
      const [loan, sum] = await Promise.all([tx.loan.findUniqueOrThrow({ where: { id: owned.id } }), tx.repayment.aggregate({ where: { loanId: owned.id }, _sum: { amount: true } })]);
      const left = new Prisma.Decimal(loan.originalAmount).minus(sum._sum.amount ?? 0);
      if (new Prisma.Decimal(parsed.data.amount).greaterThan(left)) throw Object.assign(new Error('Repayment cannot exceed the outstanding balance.'), { status: 409 });
      return tx.repayment.create({ data: { loanId: owned.id, amount: parsed.data.amount, repaymentDate: dateOnly(parsed.data.repaymentDate), note: parsed.data.note || null } });
    });
    res.status(201).json({ id: created.id, amount: String(created.amount), repaymentDate: created.repaymentDate.toISOString().slice(0, 10), note: created.note });
  } catch (error: any) {
    if (error.status) return res.status(error.status).json({ error: error.status === 404 ? 'not_found' : 'invalid_repayment', message: error.message });
    throw error;
  }
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong. Please try again.' });
});

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
app.listen(port, () => console.info(`MiniLedger API listening on http://localhost:${port}`));
