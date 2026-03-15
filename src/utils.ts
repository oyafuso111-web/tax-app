export function isSameMonth(txDateStr: string, currentMonthStr: string): boolean {
    if (!txDateStr || !currentMonthStr) return false;

    const [cYear, cMonth] = currentMonthStr.split('-');
    const [tYear, tMonth] = txDateStr.split(/[-/]/); // Handle both 2025-12-15 and 2025/12/15

    return Number(cYear) === Number(tYear) && Number(cMonth) === Number(tMonth);
}
