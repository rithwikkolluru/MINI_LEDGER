import { Prisma } from '@prisma/client';

export function loanTotals(original: string | Prisma.Decimal, repayments: Array<string | Prisma.Decimal>) {
  const lent: Prisma.Decimal = new Prisma.Decimal(String(original));
  const repaid: Prisma.Decimal = repayments.reduce<Prisma.Decimal>((sum, value) => sum.plus(String(value)), new Prisma.Decimal(0));
  return { lent, repaid, outstanding: Prisma.Decimal.max(0, lent.minus(repaid)) };
}

export function isOverdue(outstanding: string | Prisma.Decimal, dueDate: string, today: string) {
  return new Prisma.Decimal(outstanding).greaterThan(0) && dueDate < today;
}

export function summaryTotals(rows: Array<{ lent: string; repaid: string; outstanding: string; overdue: boolean; status: string }>) {
  const total = (key: 'lent' | 'repaid' | 'outstanding') => rows.reduce<Prisma.Decimal>((sum, row) => sum.plus(row[key]), new Prisma.Decimal(0)).toFixed(2);
  return {
    totalLent: total('lent'), totalRepaid: total('repaid'), outstanding: total('outstanding'),
    overdueAmount: rows.filter(row => row.overdue).reduce<Prisma.Decimal>((sum, row) => sum.plus(row.outstanding), new Prisma.Decimal(0)).toFixed(2),
    activeLoans: rows.filter(row => row.status !== 'repaid').length,
    overdueLoans: rows.filter(row => row.overdue).length,
    fullyRepaidLoans: rows.filter(row => row.status === 'repaid').length
  };
}
