import 'dotenv/config';
import { prisma } from '../src/db';

async function main() {
  if (process.env.NODE_ENV !== 'development') throw new Error('Seed data is restricted to NODE_ENV=development.');
  const phoneNumber = '+919999000001';
  const user = await prisma.user.upsert({ where: { phoneNumber }, create: { phoneNumber }, update: {} });
  await prisma.repayment.deleteMany({ where: { loan: { userId: user.id } } });
  await prisma.loan.deleteMany({ where: { userId: user.id } });
  const today = new Date(); const day = (offset: number) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset));
  const data = [
    { friendName: 'Ananya Rao', originalAmount: '12500.00', loanDate: day(-15), dueDate: day(-2), notes: 'Travel booking' },
    { friendName: 'Rohan Kapoor', originalAmount: '8000.00', loanDate: day(-6), dueDate: day(7), notes: 'Laptop repair' },
    { friendName: 'Meera Shah', originalAmount: '5000.00', loanDate: day(-35), dueDate: day(-15), notes: 'Course fee' },
    { friendName: 'Kabir Nair', originalAmount: '3200.00', loanDate: day(-60), dueDate: day(-30), notes: 'Dinner split' }
  ];
  const loans = [];
  for (const item of data) loans.push(await prisma.loan.create({ data: { ...item, userId: user.id } }));
  await prisma.repayment.createMany({ data: [
    { loanId: loans[0].id, amount: '2500.00', repaymentDate: day(-4), note: 'UPI' },
    { loanId: loans[1].id, amount: '2000.00', repaymentDate: day(-1), note: 'Part payment' },
    { loanId: loans[2].id, amount: '5000.00', repaymentDate: day(-10), note: 'Settled' },
    { loanId: loans[3].id, amount: '3200.00', repaymentDate: day(-25), note: 'Settled' }
  ] });
  console.info(`Seeded development data for ${phoneNumber}.`);
}
main().finally(() => prisma.$disconnect());
