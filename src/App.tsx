import { useState, useEffect, useCallback } from 'react';
import type { Transaction } from './types';
import { TransactionForm } from './components/TransactionForm';
import { MonthlySummary } from './components/MonthlySummary';
import { TransactionList } from './components/TransactionList';
import { MonthlyChart } from './components/MonthlyChart';
import { YearlyChart } from './components/YearlyChart';
import { MonthlyCategoryTable } from './components/MonthlyCategoryTable';
import { supabase } from './lib/supabase';
import './App.css';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Auth state handling
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
 Riverside

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch data from Supabase
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data || []);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    } else {
      // Load from localStorage if not logged in (legacy support)
      const saved = localStorage.getItem('tax-app-transactions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTransactions(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error('Failed to parse localStorage', e);
          setTransactions([]);
        }
      } else {
        setTransactions([]);
      }
    }
  }, [user, fetchTransactions]);

  // 3. Migration Logic
  useEffect(() => {
    if (user) {
      const localData = localStorage.getItem('tax-app-transactions');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            migrateData(parsed);
          } else {
            localStorage.removeItem('tax-app-transactions');
          }
        } catch (e) {
          console.error('Migration check failed', e);
        }
      }
    }
  }, [user]);

  const migrateData = async (localTransactions: Transaction[]) => {
    if (!user) return;
    
    const transactionsToSync = localTransactions.map(t => ({
      ...t,
      user_id: user.id
    }));

    const { error } = await supabase.from('transactions').upsert(transactionsToSync);
    if (!error) {
      localStorage.removeItem('tax-app-transactions');
      fetchTransactions();
      alert('ローカルデータをオンラインに同期しました！');
    } else {
      console.error('Migration error:', error);
    }
  };

  const handleAddTransaction = async (newTransaction: Omit<Transaction, 'id'>) => {
    const id = crypto.randomUUID();
    const transaction: Transaction = {
      ...newTransaction,
      id,
      user_id: user?.id
    };

    if (user) {
      const { error } = await supabase.from('transactions').insert([transaction]);
      if (error) {
        console.error('Error adding transaction:', error);
        alert('保存に失敗しました。');
      } else {
        fetchTransactions();
      }
    } else {
      const updated = [transaction, ...transactions];
      setTransactions(updated);
      localStorage.setItem('tax-app-transactions', JSON.stringify(updated));
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (user) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) console.error('Error deleting transaction:', error);
      else fetchTransactions();
    } else {
      const updated = transactions.filter((t) => t.id !== id);
      setTransactions(updated);
      localStorage.setItem('tax-app-transactions', JSON.stringify(updated));
    }
  };

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    if (user) {
      const { error } = await supabase.from('transactions').update(updatedTx).eq('id', updatedTx.id);
      if (error) console.error('Error updating transaction:', error);
      else fetchTransactions();
    } else {
      const updated = transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t));
      setTransactions(updated);
      localStorage.setItem('tax-app-transactions', JSON.stringify(updated));
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) alert('ログインエラー: ' + error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTransactions([]);
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    const headers = ['管理ID', '日付', '収支タイプ', '金額', '内容・メモ', '勘定科目'];
    const csvRows = [headers.join(',')];

    transactions.forEach(t => {
      const row = [
        `="${t.id}"`,
        t.date || '',
        t.type === 'income' ? '収入' : '支出',
        t.amount || 0,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `収支データ_${dateStr}.csv`;

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
        if (err.name !== 'AbortError') console.error('Share failed:', err);
      });
      return;
    }

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

  if (loading) return <div className="loading">ロード中...</div>;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-text">
          <h1 className="app-title">Tax App</h1>
          <p className="app-subtitle">シンプル収支管理アプリ</p>
        </div>
        <div className="header-actions">
          {user ? (
            <div className="user-info">
              <span className="user-email">{user.email}</span>
              <button onClick={handleLogout} className="logout-btn">ログアウト</button>
            </div>
          ) : (
            <button onClick={handleGoogleLogin} className="login-btn">ログイン</button>
          )}
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
        </div>
      </header>

      <main className="content-grid">
        <aside className="left-column">
          <TransactionForm onAddTransaction={handleAddTransaction} />
          {!user && (
            <div className="glass-panel login-prompt" style={{ marginTop: '16px', textAlign: 'center', padding: '20px' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                ログインするとスマホと同期できます
              </p>
              <button onClick={handleGoogleLogin} className="login-btn" style={{ width: '100%' }}>
                Googleでログイン
              </button>
            </div>
          )}
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

      <section className="bottom-row" style={{ marginTop: '24px' }}>
        <YearlyChart transactions={transactions} currentMonth={currentMonth} />
        <MonthlyCategoryTable transactions={transactions} currentMonth={currentMonth} />
      </section>
    </div>
  );
}

export default App;
