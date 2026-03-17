import { useState } from 'react';
import type { Transaction } from '../types';
import { isSameMonth } from '../utils';
import { BLUE_RETURN_CATEGORIES } from './TransactionForm';
import './TransactionList.css';

interface TransactionListProps {
    transactions: Transaction[];
    currentMonth: string; // YYYY-MM
    onDelete: (id: string) => void;
    onUpdate: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, currentMonth, onDelete, onUpdate }: TransactionListProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Transaction | null>(null);

    // Filter transactions for the current month and sort by date descending
    const monthlyTransactions = transactions
        .filter((t) => isSameMonth(t.date, currentMonth))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleStartEdit = (transaction: Transaction) => {
        setEditingId(transaction.id);
        setEditForm({ ...transaction });
    };

    const handleSaveEdit = () => {
        if (editForm) {
            onUpdate(editForm);
            setEditingId(null);
            setEditForm(null);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

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
                    <div key={transaction.id} className={`transaction-item ${transaction.type} ${editingId === transaction.id ? 'editing' : ''}`}>
                        {editingId === transaction.id && editForm ? (
                            <div className="edit-form-inline">
                                <div className="edit-fields">
                                    <input
                                        type="date"
                                        value={editForm.date}
                                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                        className="edit-input"
                                    />
                                    <input
                                        type="text"
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        className="edit-input"
                                        placeholder="説明"
                                    />
                                    <input
                                        type="number"
                                        value={editForm.amount}
                                        onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                                        className="edit-input"
                                        placeholder="金額"
                                    />
                                    <select
                                        value={editForm.category || ''}
                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                        className="edit-input"
                                    >
                                        <option value="">(未分類)</option>
                                        {BLUE_RETURN_CATEGORIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select
                                        value={editForm.transaction_method || ''}
                                        onChange={(e) => setEditForm({ ...editForm, transaction_method: e.target.value })}
                                        className="edit-input"
                                    >
                                        <option value="">(取引手段なし)</option>
                                        {['現金', '普通預金', 'クレジットカード', '未払金', 'その他'].map((m) => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="edit-actions">
                                    <button onClick={handleSaveEdit} className="save-btn">保存</button>
                                    <button onClick={handleCancelEdit} className="cancel-btn">中止</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="transaction-info" onClick={() => handleStartEdit(transaction)} style={{ cursor: 'pointer', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="transaction-date">{transaction.date}</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {transaction.transaction_method && <span className="transaction-category-tag" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>{transaction.transaction_method}</span>}
                                            <span className="transaction-category-tag">{transaction.category || '未分類'}</span>
                                        </div>
                                    </div>
                                    <span className="transaction-desc">{transaction.description}</span>
                                </div>

                                <div className="transaction-actions">
                                    <span className={`transaction-amount ${transaction.type}`} onClick={() => handleStartEdit(transaction)} style={{ cursor: 'pointer' }}>
                                        {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toLocaleString()}
                                    </span>
                                    <button
                                        className="delete-btn"
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            if (window.confirm('削除してよいですか？')) {
                                                onDelete(transaction.id);
                                            }
                                        }}
                                        title="削除"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
