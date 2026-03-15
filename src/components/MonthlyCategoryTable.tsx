import { useMemo } from 'react';
import type { Transaction } from '../types';
import './MonthlyCategoryTable.css';

interface MonthlyCategoryTableProps {
    transactions: Transaction[];
    currentMonth: string; // YYYY-MM
}

export function MonthlyCategoryTable({ transactions, currentMonth }: MonthlyCategoryTableProps) {
    const currentYear = currentMonth.split('-')[0];
    const currentMonthNum = currentMonth.split('-')[1];

    const categoryStats = useMemo(() => {
        const monthlyTotals: Record<string, number> = {};
        const yearlyTotals: Record<string, number> = {};
        let monthlyGrandTotal = 0;
        let yearlyGrandTotal = 0;

        transactions.forEach(t => {
            if (t.type === 'expense') {
                const category = t.category || '未分類';
                const dateStr = t.date || '';

                // Accumulate yearly
                if (dateStr.startsWith(currentYear)) {
                    yearlyTotals[category] = (yearlyTotals[category] || 0) + t.amount;
                    yearlyGrandTotal += t.amount;

                    // Accumulate monthly
                    if (dateStr.startsWith(currentMonth)) {
                        monthlyTotals[category] = (monthlyTotals[category] || 0) + t.amount;
                        monthlyGrandTotal += t.amount;
                    }
                }
            }
        });

        // Get unique categories and sort them
        const allCategories = Array.from(new Set([
            ...Object.keys(monthlyTotals),
            ...Object.keys(yearlyTotals)
        ])).sort();

        return {
            items: allCategories.map(name => ({
                name,
                monthly: monthlyTotals[name] || 0,
                yearly: yearlyTotals[name] || 0
            })).sort((a, b) => b.yearly - a.yearly), // Sort by yearly total desc
            monthlyGrandTotal,
            yearlyGrandTotal
        };
    }, [transactions, currentMonth, currentYear]);

    if (categoryStats.items.length === 0) {
        return null;
    }

    return (
        <div className="glass-panel category-table-container">
            <h3>{currentYear}年 勘定科目別集計</h3>
            <div className="table-wrapper">
                <table className="category-table">
                    <thead>
                        <tr>
                            <th>勘定科目</th>
                            <th className="amount-cell">{currentMonthNum}月</th>
                            <th className="amount-cell">年間合計</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categoryStats.items.map(item => (
                            <tr key={item.name}>
                                <td>{item.name}</td>
                                <td className="amount-cell">¥{item.monthly.toLocaleString()}</td>
                                <td className="amount-cell yearly-highlight">¥{item.yearly.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="total-row">
                            <td>合計支出</td>
                            <td className="amount-cell">¥{categoryStats.monthlyGrandTotal.toLocaleString()}</td>
                            <td className="amount-cell">¥{categoryStats.yearlyGrandTotal.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
