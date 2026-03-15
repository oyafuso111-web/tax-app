import React, { useState, useRef, useEffect } from 'react';
import * as Tesseract from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
import './ReceiptScanner.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ReceiptScannerProps {
    onScanComplete: (amount: number, description: string, date?: string) => void;
}

// Global worker to reuse across scans for speed
let globalWorker: Tesseract.Worker | null = null;

export function ReceiptScanner({ onScanComplete }: ReceiptScannerProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize worker on mount
    useEffect(() => {
        const initWorker = async () => {
            if (!globalWorker) {
                setStatus('認識エンジンを準備中（ネット環境により時間がかかる場合があります）...');
                try {
                    globalWorker = await Tesseract.createWorker('jpn+eng', 1);
                    setStatus('');
                } catch (e) {
                    console.error('Worker init error:', e);
                    setStatus('認識エンジンの読み込みに失敗しました。ネット接続を確認してください。');
                }
            }
        };
        initWorker();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setProgress(0);
        setStatus('ファイルを読み込み中...');

        try {
            let processedCanvas: HTMLCanvasElement;

            if (file.type === 'application/pdf') {
                processedCanvas = await convertPdfToImage(file);
            } else {
                const imageUrl = URL.createObjectURL(file);
                setPreviewUrl(imageUrl);
                processedCanvas = await preprocessImage(imageUrl);
            }

            await processOCR(processedCanvas);
        } catch (error) {
            console.error('Processing error:', error);
            setStatus('エラーが発生しました。別のファイルを試してください。');
            setIsProcessing(false);
        }
    };

    // Preprocess image for better OCR: Grayscale and Contrast
    const preprocessImage = (url: string): Promise<HTMLCanvasElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context failed'));
                    return;
                }

                // Higher resolution for better OCR especially on long receipts
                const scale = Math.min(2, 2500 / Math.max(img.width, img.height));
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Image processing: Better grayscale and thresholding
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    // Slightly more conservative thresholding to avoid "washing out" thin characters
                    let v = gray;
                    if (gray > 210) v = 255;
                    else if (gray < 70) v = 0;
                    
                    data[i] = v;
                    data[i + 1] = v;
                    data[i + 2] = v;
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas);
            };
            img.onerror = reject;
            img.src = url;
        });
    };

    const convertPdfToImage = async (file: File): Promise<HTMLCanvasElement> => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (!context) throw new Error('Could not get canvas context');

        await page.render({ canvasContext: context, viewport, canvas }).promise;
        
        // Also preprocess the PDF page
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const v = avg > 128 ? 255 : (avg < 50 ? 0 : avg);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
        }
        context.putImageData(imageData, 0, 0);

        setPreviewUrl(canvas.toDataURL());
        return canvas;
    };

    const processOCR = async (source: HTMLCanvasElement) => {
        setStatus('文字を認識中...');
        
        if (!globalWorker) {
            globalWorker = await Tesseract.createWorker('jpn+eng');
        }

        const result = await globalWorker.recognize(source, {}, {
            // Updated syntax for tesseract.js v5+ recognize
        });
        
        const text = result.data.text;
        console.log('OCR Result:', text);

        const { amount, vendor, date } = extractData(text);
        
        if (amount > 0 || date || vendor) {
            onScanComplete(amount, vendor || '', date);
            setStatus(amount > 0 ? '読み取り完了！' : '金額を特定できませんでしたが、日付や店舗名を読み取りました。');
        } else {
            setStatus('データを特定できませんでした。別の画像（明るい場所で、より近くで撮影したもの）を試してください。');
        }
        
        setIsProcessing(false);
    };

    const extractData = (text: string) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let vendor = '';
        let extractedDate = '';

        // Extract potential vendor (first 5 lines)
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            if (line.length > 2 && !line.match(/[0-9]/) && !line.match(/[合計税]/)) {
                vendor = line;
                break;
            }
        }

        // Extract date
        const dateRegex = /(\d{2,4})[/\-年](\d{1,2})[/\-月](\d{1,2})/;
        for (const line of lines) {
            const cleanLine = line.replace(/\s/g, '');
            const match = cleanLine.match(dateRegex);
            if (match) {
                let year = match[1];
                let month = match[2].padStart(2, '0');
                let day = match[3].padStart(2, '0');
                if (year.length === 2) year = '20' + year;
                extractedDate = `${year}-${month}-${day}`;
                const d = new Date(extractedDate);
                if (!isNaN(d.getTime())) break; 
            }
        }

        // Robust amount extraction logic
        const possibleAmounts: { val: number; score: number }[] = [];
        
        const currencyPatterns = [/[¥￥]\s*([0-9,]{3,})/, /([0-9,]{3,})\s*[円]/];
        const keywordPatterns = [
            /(?:合計|税込|小計|合計金額|金額|計|TOTAL|Total|Amount|SUBTOTAL)[^\d]*([0-9,]{3,})/i,
            /([0-9,]{3,})[^\d]*(?:合計|税込|小計|合計金額|金額|計|TOTAL|Total|Amount|SUBTOTAL)/i
        ];

        const exclusionKeywords = ['商品券', '割引', '値引', 'お釣り', '釣銭', 'クーポン', 'ギフト', 'ポイント'];
        
        for (const line of lines) {
            const cleanLine = line.replace(/\s/g, '');
            
            if (cleanLine.match(/\d{2,4}[/-]\d{1,2}[/-]\d{1,2}/)) continue;
            if (cleanLine.match(/\d{2,4}-\d{2,4}-\d{2,4}/)) continue;

            // Check for exclusion keywords in the same line
            let isExcluded = false;
            for (const key of exclusionKeywords) {
                if (line.includes(key)) {
                    isExcluded = true;
                    break;
                }
            }

            // Scenario 1: Currency match
            for (const pat of currencyPatterns) {
                const match = line.match(pat);
                if (match) {
                    const val = parseInt(match[1].replace(/,/g, ''), 10);
                    if (val >= 10 && val < 10000000) {
                        possibleAmounts.push({ val, score: isExcluded ? 5 : 100 });
                    }
                }
            }

            // Scenario 2: Keyword match
            for (const pat of keywordPatterns) {
                const match = line.match(pat);
                if (match) {
                    const val = parseInt(match[1].replace(/,/g, ''), 10);
                    if (val >= 10 && val < 10000000) {
                        possibleAmounts.push({ val, score: isExcluded ? 5 : 90 });
                    }
                }
            }

            // Scenario 3: Large numbers with commas
            const commaMatch = line.match(/([0-9]{1,3}(?:,[0-9]{3})+)/);
            if (commaMatch) {
                const val = parseInt(commaMatch[1].replace(/,/g, ''), 10);
                if (val >= 10 && val < 10000000) possibleAmounts.push({ val, score: 50 });
            }

            // Scenario 4: Any 3+ digit numbers
            const generalMatch = cleanLine.match(/([0-9]{3,})/);
            if (generalMatch) {
                const val = parseInt(generalMatch[1], 10);
                if (val >= 10 && val < 10000000 && generalMatch[1].length < 8) {
                    possibleAmounts.push({ val, score: 10 });
                }
            }
        }

        possibleAmounts.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.val - a.val;
        });

        const bestAmount = possibleAmounts.length > 0 ? possibleAmounts[0].val : 0;

        return { amount: bestAmount, vendor, date: extractedDate };
    };

    return (
        <div className="receipt-scanner">
            <div className="scanner-controls">
                <label className="scan-btn-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    カメラ撮影・ファイル選択
                    <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        capture="environment" 
                        onChange={handleFileChange} 
                        disabled={isProcessing}
                        ref={fileInputRef}
                    />
                </label>
                <div className="scanner-description">
                    <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '4px 0' }}>
                        JPEG, PNG, PDFに対応しています
                    </p>
                </div>
            </div>

            {isProcessing && (
                <div className="scanner-status-area">
                    <div className="scanner-status">{status}</div>
                    <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            {!isProcessing && status && (
                <div className="extraction-result">{status}</div>
            )}

            {previewUrl && (
                <img src={previewUrl} alt="Receipt preview" className="image-preview" />
            )}
        </div>
    );
}
