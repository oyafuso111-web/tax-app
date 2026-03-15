import { useMemo } from 'react';
import type { Transaction } from '../types';
import { isSameMonth } from '../utils';
import './MonthlySummary.css';

interface MonthlySummaryProps {
    transactions: Transaction[];
    currentMonth: string; // YYYY-MM
}

export function MonthlySummary({ transactions, currentMonth }: MonthlySummaryProps) {
    const { totalIncome, totalExpense, balance } = useMemo(() => {
        return transactions
            .filter((t) => isSameMonth(t.date, currentMonth))
            .reduce(
                (acc, curr) => {
                    if (curr.type === 'income') {
                        acc.totalIncome += curr.amount;
                    } else {
                        acc.totalExpense += curr.amount;
                    }
                    acc.balance = acc.totalIncome - acc.totalExpense;
                    return acc;
                },
                { totalIncome: 0, totalExpense: 0, balance: 0 }
            );
    }, [transactions, currentMonth]);

    // Format YYYY-MM to readable Japanese format
    const [year, month] = currentMonth.split('-');
    const displayMonth = `${year}年 ${parseInt(month, 10)}月`;

    return (
        <div className="glass-panel summary-container">
            <div className="summary-header">
                <h2>{displayMonth} のサマリー</h2>
            </div>

            <div className="cards-grid">
                <div className="summary-card income">
                    <div className="card-icon">↓</div>
                    <div className="card-content">
                        <h3>収入</h3>
                        <p className="amount">¥{totalIncome.toLocaleString()}</p>
                    </div>
                </div>

                <div className="summary-card expense">
                    <div className="card-icon up">↑</div>
                    <div className="card-content">
                        <h3>支出</h3>
                        <p className="amount">¥{totalExpense.toLocaleString()}</p>
                    </div>
                </div>

                <div className="summary-card balance">
                    <div className="card-icon equal">=</div>
                    <div className="card-content">
                        <h3>残高</h3>
                        <p className={`amount ${balance >= 0 ? 'positive' : 'negative'}`}>
                            ¥{balance.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
