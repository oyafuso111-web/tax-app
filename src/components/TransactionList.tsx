import type { Transaction } from '../types';
import { isSameMonth } from '../utils';
import './TransactionList.css';

interface TransactionListProps {
    transactions: Transaction[];
    currentMonth: string; // YYYY-MM
    onDelete: (id: string) => void;
}

export function TransactionList({ transactions, currentMonth, onDelete }: TransactionListProps) {
    // Filter transactions for the current month and sort by date descending
    const monthlyTransactions = transactions
        .filter((t) => isSameMonth(t.date, currentMonth))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (monthlyTransactions.length === 0) {
        return (
            <div className="glass-panel list-container empty-state">
                <p>この月の履歴はありません。</p>
            </div>
        );
    }

    return (
        <div className="glass-panel list-container">
            <h3>入力履歴</h3>
            <div className="transaction-list">
                {monthlyTransactions.map((transaction) => (
                    <div key={transaction.id} className={`transaction-item ${transaction.type}`}>
                        <div className="transaction-info">
                            <span className="transaction-date">{transaction.date}</span>
                            <span className="transaction-desc">{transaction.description}</span>
                        </div>

                        <div className="transaction-actions">
                            <span className={`transaction-amount ${transaction.type}`}>
                                {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toLocaleString()}
                            </span>
                            <button
                                className="delete-btn"
                                onClick={() => onDelete(transaction.id)}
                                title="削除"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
