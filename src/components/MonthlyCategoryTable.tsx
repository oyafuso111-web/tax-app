import { useMemo } from 'react';
import type { Transaction } from '../types';
import './MonthlyCategoryTable.css';

interface MonthlyCategoryTableProps {
    transactions: Transaction[];
    currentMonth: string; // YYYY-MM
}

export function MonthlyCategoryTable({ transactions, currentMonth }: MonthlyCategoryTableProps) {
    const currentYear = currentMonth.split('-')[0];
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

    const categoryStats = useMemo(() => {
        const stats: Record<string, Record<string, number>> = {};
        const yearlyTotals: Record<string, number> = {};
        const monthTotals: Record<string, number> = {};
        let grandTotal = 0;

        // Initialize month totals
        months.forEach(m => monthTotals[m] = 0);

        transactions.forEach(t => {
            if (t.type === 'expense') {
                const dateStr = t.date || '';
                if (dateStr.startsWith(currentYear)) {
                    const category = t.category || '未分類';
                    const month = dateStr.split('-')[1];

                    if (!stats[category]) {
                        stats[category] = {};
                        months.forEach(m => stats[category][m] = 0);
                        yearlyTotals[category] = 0;
                    }

                    stats[category][month] += t.amount;
                    yearlyTotals[category] += t.amount;
                    monthTotals[month] += t.amount;
                    grandTotal += t.amount;
                }
            }
        });

        const items = Object.entries(stats).map(([name, mData]) => ({
            name,
            monthly: mData,
            yearly: yearlyTotals[name]
        })).sort((a, b) => b.yearly - a.yearly);

        return { items, monthTotals, grandTotal };
    }, [transactions, currentYear, months]);

    if (categoryStats.items.length === 0) {
        return null;
    }

    return (
        <div className="glass-panel category-table-container">
            <h3>{currentYear}年 勘定科目別・月別推移</h3>
            <div className="table-wrapper yearly-full-scroll">
                <table className="category-table yearly-table">
                    <thead>
                        <tr>
                            <th className="sticky-col">勘定科目</th>
                            {months.map(m => (
                                <th key={m} className="month-col">{parseInt(m)}月</th>
                            ))}
                            <th className="total-col">年間合計</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categoryStats.items.map(item => (
                            <tr key={item.name}>
                                <td className="sticky-col category-name">{item.name}</td>
                                {months.map(m => (
                                    <td key={m} className="amount-cell">
                                        {item.monthly[m] > 0 ? `¥${item.monthly[m].toLocaleString()}` : '-'}
                                    </td>
                                ))}
                                <td className="amount-cell yearly-highlight">
                                    ¥{item.yearly.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="total-row">
                            <td className="sticky-col">合計支出</td>
                            {months.map(m => (
                                <td key={m} className="amount-cell">
                                    ¥{categoryStats.monthTotals[m].toLocaleString()}
                                </td>
                            ))}
                            <td className="amount-cell">
                                ¥{categoryStats.grandTotal.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p className="scroll-hint">← 横スクロールで各月の推移を確認できます →</p>
        </div>
    );
}
