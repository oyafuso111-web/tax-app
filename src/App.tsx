import { useState, useEffect } from 'react';
import type { Transaction } from './types';
import { TransactionForm } from './components/TransactionForm';
import { MonthlySummary } from './components/MonthlySummary';
import { TransactionList } from './components/TransactionList';
import { MonthlyChart } from './components/MonthlyChart';
import { YearlyChart } from './components/YearlyChart';
import { MonthlyCategoryTable } from './components/MonthlyCategoryTable';
import './App.css';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('tax-app-transactions');
    if (saved) {
      try {
        const parsed: Transaction[] = JSON.parse(saved);
        // Fix malformed dates created by automated subagent tests e.g. "202512-12-08" -> "2025-12-08"
        return parsed.map(t => {
          if (t.date && t.date.match(/^\d{6}-\d{2}-\d{2}$/)) {
            return { ...t, date: `${t.date.substring(0, 4)}-${t.date.substring(4, 6)}-${t.date.substring(10)}` };
          }
          if (t.date && t.date.length === 7 && t.date.match(/^\d{4}-\d{2}$/)) {
            return { ...t, date: `${t.date}-01` };
          }
          return t;
        });
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem('tax-app-transactions', JSON.stringify(transactions));
  }, [transactions]);

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    // Generate ID in YYYYMMDDHHmmss format based on current time
    const now = new Date();
    const id = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const transaction: Transaction = {
      ...newTx,
      id,
    };
    setTransactions((prev) => [transaction, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    // Create CSV headers in Japanese
    const headers = ['管理ID', '日付', '収支タイプ', '金額', '内容・メモ', '勘定科目'];
    const csvRows = [headers.join(',')];

    // Format each transaction
    transactions.forEach(t => {
      const row = [
        `="${t.id}"`,
        t.date,
        t.type === 'income' ? '収入' : '支出',
        t.amount,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    // Generate CSV data with Japanese headers and BOM for Excel
    const csvContent = csvRows.join('\n');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `収支データ_${dateStr}.csv`;

    // Attempt to use Web Share API for better mobile support (especially iOS Chrome)
    const blob = new Blob(
      [new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent],
      { type: 'text/csv;charset=utf-8' }
    );
    const file = new File([blob], fileName, { type: 'text/csv' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: '収支データ出力',
        text: 'Tax Appから出力された収支データ(CSV)です。'
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      });
      return;
    }

    // Desktop/Fallback: Use Data URL or URL.createObjectURL
    const encodedContent = encodeURIComponent(csvContent);
    const dataUrl = `data:text/csv;charset=utf-8,%EF%BB%BF${encodedContent}`;
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUrl);
    link.setAttribute('download', fileName);
    
    link.style.display = 'none';
    document.body.appendChild(link);
    
    try {
      link.click();
    } catch (e) {
      window.location.href = dataUrl;
    }

    requestAnimationFrame(() => {
      document.body.removeChild(link);
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-text">
          <h1 className="app-title">Tax App</h1>
          <p className="app-subtitle">シンプル収支管理アプリ</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="export-btn"
          disabled={transactions.length === 0}
          title="CSV形式でダウンロード"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          CSV出力
        </button>
      </header>

      <main className="content-grid">
        <aside className="left-column">
          <TransactionForm onAddTransaction={handleAddTransaction} />
          <MonthlyChart transactions={transactions} currentMonth={currentMonth} />
        </aside>

        <section className="right-column">
          <div className="month-selector glass-panel" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                value={currentMonth.split('-')[0]}
                onChange={(e) => {
                  const newYear = e.target.value;
                  const currentM = currentMonth.split('-')[1];
                  setCurrentMonth(`${newYear}-${currentM}`);
                }}
                className="year-input"
                style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600, color: 'var(--text-primary)' }}
                min="2000"
                max="2100"
              />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>年</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                value={currentMonth.split('-')[1]}
                onChange={(e) => {
                  const currentY = currentMonth.split('-')[0];
                  const newMonth = e.target.value;
                  setCurrentMonth(`${currentY}-${newMonth}`);
                }}
                className="month-input"
                style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const m = String(i + 1).padStart(2, '0');
                  return <option key={m} value={m}>{i + 1}月</option>;
                })}
              </select>
            </div>
          </div>
          <MonthlySummary transactions={transactions} currentMonth={currentMonth} />
          <TransactionList
            transactions={transactions}
            currentMonth={currentMonth}
            onDelete={handleDeleteTransaction}
            onUpdate={handleUpdateTransaction}
          />
        </section>
      </main>

      <section className="bottom-row">
        <YearlyChart transactions={transactions} currentMonth={currentMonth} />
        <MonthlyCategoryTable transactions={transactions} currentMonth={currentMonth} />
      </section>
    </div>
  );
}

export default App;
