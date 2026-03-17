import { useState } from 'react';
import type { Transaction, TransactionType } from '../types';
import { ReceiptScanner } from './ReceiptScanner';
import './TransactionForm.css';

interface TransactionFormProps {
    onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

export const BLUE_RETURN_CATEGORIES = [
    '消耗品費',
    '旅費交通費',
    '通信費',
    '接待交際費',
    '広告宣伝費',
    '水道光熱費',
    '新聞図書費',
    '支払手数料',
    '修繕費',
    '地代家賃',
    '保険料',
    '給料賃金',
    '会議費',
    '福利厚生費',
    '荷造運賃',
    '諸会費',
    '雑費'
];

export const TRANSACTION_METHODS = [
    '現金',
    '普通預金',
    'クレジットカード',
    '未払金',
    'その他'
];

export function TransactionForm({ onAddTransaction }: TransactionFormProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [transactionMethod, setTransactionMethod] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    
    // Splitting logic states
    const [baseAmount, setBaseAmount] = useState('');
    const [allocationRatio, setAllocationRatio] = useState('100');

    const calculateAllocatedAmount = (base: string, ratio: string) => {
        const b = parseFloat(base.replace(/,/g, ''));
        const r = parseFloat(ratio);
        if (isNaN(b) || isNaN(r)) return '';
        return Math.round(b * (r / 100)).toString();
    };

    const handleBaseAmountChange = (val: string) => {
        setBaseAmount(val);
        const allocated = calculateAllocatedAmount(val, allocationRatio);
        setAmount(allocated);
    };

    const handleRatioChange = (val: string) => {
        setAllocationRatio(val);
        const allocated = calculateAllocatedAmount(baseAmount, val);
        setAmount(allocated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount))) return;

        onAddTransaction({
            date,
            type,
            amount: Number(amount),
            description: description + (category ? ` (${category})` : ''),
            category: category || undefined,
            transaction_method: transactionMethod || undefined,
        });

        // Reset form
        setAmount('');
        setBaseAmount('');
        setAllocationRatio('100');
        setDescription('');
        setCategory('');
        setTransactionMethod('');
        setShowScanner(false);
    };

    const handleScanComplete = (scannedAmount: number, scannedVendor: string, scannedDate?: string) => {
        if (scannedAmount > 0) {
            setBaseAmount(scannedAmount.toString());
            const allocated = calculateAllocatedAmount(scannedAmount.toString(), allocationRatio);
            setAmount(allocated);
        }
        if (scannedVendor) setDescription(scannedVendor);
        if (scannedDate) setDate(scannedDate);
        setType('expense');
    };

    return (
        <div className="glass-panel form-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>収支を入力</h2>
                <button 
                    type="button" 
                    className="scan-toggle-btn"
                    onClick={() => setShowScanner(!showScanner)}
                    style={{
                        padding: '6px 12px',
                        background: showScanner ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        color: showScanner ? '#ef4444' : '#6366f1',
                        border: `1px solid ${showScanner ? '#ef4444' : '#6366f1'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    {showScanner ? 'キャンセル' : 'レシートをスキャン'}
                </button>
            </div>

            {showScanner && (
                <ReceiptScanner onScanComplete={handleScanComplete} />
            )}

            <form onSubmit={handleSubmit} className="transaction-form" style={{ marginTop: showScanner ? '20px' : '0' }}>
                <div className="form-group">
                    <label>日付</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group type-group">
                    <label>タイプ</label>
                    <div className="type-toggle">
                        <button
                            type="button"
                            className={`toggle-btn ${type === 'income' ? 'active income' : ''}`}
                            onClick={() => setType('income')}
                        >
                            収入
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn ${type === 'expense' ? 'active expense' : ''}`}
                            onClick={() => setType('expense')}
                        >
                            支出
                        </button>
                    </div>
                </div>

                <div className="splitting-container" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'minmax(120px, 1.5fr) 1fr', 
                    gap: '12px', 
                    padding: '12px', 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    alignItems: 'end'
                }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', opacity: 0.8, whiteSpace: 'nowrap' }}>レシート総額 (¥)</label>
                        <input
                            type="number"
                            value={baseAmount}
                            onChange={(e) => handleBaseAmountChange(e.target.value)}
                            placeholder="0"
                            style={{ height: '38px', padding: '8px' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', opacity: 0.8, whiteSpace: 'nowrap' }}>按分率 (%)</label>
                        <input
                            type="number"
                            value={allocationRatio}
                            onChange={(e) => handleRatioChange(e.target.value)}
                            placeholder="100"
                            min="0"
                            max="100"
                            style={{ height: '38px', padding: '8px' }}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>計上金額 (¥)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        min="1"
                        required
                        style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-color, #6366f1)' }}
                    />
                </div>

                <div className="form-group">
                    <label>勘定科目（青色申告用）</label>
                    <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="">選択してください...</option>
                        {BLUE_RETURN_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>取引手段</label>
                    <select 
                        value={transactionMethod} 
                        onChange={(e) => setTransactionMethod(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="">選択してください...</option>
                        {TRANSACTION_METHODS.map(method => (
                            <option key={method} value={method}>{method}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>メモ</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="例: 食費、給料など..."
                        required
                    />
                </div>

                <button type="submit" className="submit-btn" style={{ marginTop: '10px' }}>
                    {type === 'income' ? '収入を追加' : '支出を追加'}
                </button>
            </form>
        </div>
    );
}
