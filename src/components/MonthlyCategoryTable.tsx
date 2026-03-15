import { useMemo } from 'react';
import type { Transaction } from '../types';
import './MonthlyCategoryTable.css';

interface MonthlyCategoryTableProps {
    transactions: Transaction[];
    currentMonth: string; // YYYY-MM
}

export function MonthlyCategoryTable({ transactions, currentMonth }: MonthlyCategoryTableProps) {
    const categoryTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        let grandTotal = 0;

        transactions.forEach(t => {
            if (t.date.startsWith(currentMonth)) {
                // We only aggregate expenses for category breakdown (usually)
                if (t.type === 'expense') {
                    const category = t.category || '未分類';
                    totals[category] = (totals[category] || 0) + t.amount;
                    grandTotal += t.amount;
                }
            }
        });

        // Convert to array and sort by amount desc
        return {
            items: Object.entries(totals)
                .map(([name, amount]) => ({ name, amount }))
                .sort((a, b) => b.amount - a.amount),
            grandTotal
        };
    }, [transactions, currentMonth]);

    if (categoryTotals.items.length === 0) {
        return null; // Don't show if no categorizable expenses
    }

    return (
        <div className="glass-panel category-table-container">
            <h3>{currentMonth.split('-')[1]}月の勘定科目別集計</h3>
            <div className="table-wrapper">
                <table className="category-table">
                    <thead>
                        <tr>
                            <th>勘定科目</th>
                            <th className="amount-cell">金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categoryTotals.items.map(item => (
                            <tr key={item.name}>
                                <td>{item.name}</td>
                                <td className="amount-cell">¥{item.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="total-row">
                            <td>合計支出</td>
                            <td className="amount-cell">¥{categoryTotals.grandTotal.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
