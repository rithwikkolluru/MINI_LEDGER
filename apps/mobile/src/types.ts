export type Summary = { currency: string; totalLent: string; totalRepaid: string; outstanding: string; overdueAmount: string; activeLoans: number; overdueLoans: number; fullyRepaidLoans: number };
export type Repayment = { id: string; amount: string; repaymentDate: string; note?: string | null };
export type Loan = { id: string; friendName: string; friendPhone?: string | null; originalAmount: string; totalRepaid: string; outstanding: string; loanDate: string; dueDate: string; notes?: string | null; status: 'outstanding' | 'overdue' | 'repaid'; repayments: Repayment[] };
