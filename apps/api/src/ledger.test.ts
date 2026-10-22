import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isOverdue, loanTotals, summaryTotals } from './ledger';

describe('MiniLedger money rules', () => {
  it('keeps partial repayments exact and preserves lent = repaid + outstanding', () => {
    const t = loanTotals('5000.00', ['1000.10', '1499.90']);
    assert.equal(t.repaid.toFixed(2), '2500.00');
    assert.equal(t.outstanding.toFixed(2), '2500.00');
    assert.equal(t.lent.toFixed(2), t.repaid.plus(t.outstanding).toFixed(2));
  });

  it('does not count fully repaid past-due loans as overdue', () => {
    assert.equal(isOverdue('0.00', '2026-10-01', '2026-10-22'), false);
    assert.equal(isOverdue('1.00', '2026-10-22', '2026-10-22'), false);
    assert.equal(isOverdue('1.00', '2026-10-21', '2026-10-22'), true);
  });

  it('summarizes loans without including repaid balances in overdue amounts', () => {
    const result = summaryTotals([
      { lent: '100.00', repaid: '25.00', outstanding: '75.00', overdue: true, status: 'overdue' },
      { lent: '40.00', repaid: '40.00', outstanding: '0.00', overdue: false, status: 'repaid' }
    ]);
    assert.deepEqual(result, { totalLent: '140.00', totalRepaid: '65.00', outstanding: '75.00', overdueAmount: '75.00', activeLoans: 1, overdueLoans: 1, fullyRepaidLoans: 1 });
  });
});
