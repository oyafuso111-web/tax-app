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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Auth state handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch data from Supabase
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);
    
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
      // Load from localStorage if not logged in (for guest mode or before migration)
      const saved = localStorage.getItem('tax-transactions');
      if (saved) setTransactions(JSON.parse(saved));
    }
  }, [user, fetchTransactions]);

  // 3. Migration Logic
  useEffect(() => {
    if (user) {
      const localData = localStorage.getItem('tax-transactions');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed.length > 0) {
          migrateData(parsed);
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
      localStorage.removeItem('tax-transactions');
      fetchTransactions();
      alert('ローカルデータをオンラインに同期しました！');
    }
  };

  const handleAddTransaction = async (newTransaction: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = {
      ...newTransaction,
      id: crypto.randomUUID(),
      user_id: user?.id
    };

    if (user) {
      const { error } = await supabase.from('transactions').insert([transaction]);
      if (error) console.error('Error adding transaction:', error);
      else fetchTransactions();
    } else {
      const updated = [transaction, ...transactions];
      setTransactions(updated);
      localStorage.setItem('tax-transactions', JSON.stringify(updated));
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
      localStorage.setItem('tax-transactions', JSON.stringify(updated));
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
      localStorage.setItem('tax-transactions', JSON.stringify(updated));
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
