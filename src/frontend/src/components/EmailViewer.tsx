'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { ArrowLeft, Download, Copy, Maximize2, Code, Eye } from 'lucide-react';

interface EmailViewerProps {
    messageId: string | null;
    onBack: () => void;
}

interface FullMessage {
    id: string;
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    date: string;
    headers: any;
}

export function EmailViewer({ messageId, onBack }: EmailViewerProps) {
    const [message, setMessage] = useState<FullMessage | null>(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');

    useEffect(() => {
        if (!messageId) return;

        const fetchMessage = async () => {
            setLoading(true);
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                const res = await fetch(`${apiUrl}/message/${messageId}`);
                const data = await res.json();
                setMessage(data);
            } catch (e) {
                console.error('Failed to fetch message details', e);
            } finally {
                setLoading(false);
            }
        };

        fetchMessage();
    }, [messageId]);

    if (loading || !message) {
        return (
            <div className="flex items-center justify-center h-full text-[#00FF94]">
                <div className="w-12 h-12 border-4 border-[#00FF94] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0B0E14]/80 backdrop-blur-md">
            {/* Header */}
            <div className="p-6 border-b border-[#ffffff05] bg-[#0B0E14]/50">
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-[#151A23] border border-[#333] rounded-xl p-4 w-full shadow-lg">
                        <h2 className="text-xl font-bold text-white mb-4 leading-tight">{message.subject}</h2>

                        <div className="flex flex-col gap-2 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium w-12">De:</span>
                                <span className="text-[#00FF94] font-mono bg-[#00FF94]/10 px-2 py-0.5 rounded">{message.from}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium w-12">Para:</span>
                                <span className="text-gray-300 font-mono">{message.to}</span>
                            </div>
                        </div>
                    </div>
                    <div className="ml-4 text-xs text-gray-500 font-mono whitespace-nowrap pt-2 bg-[#151A23] px-3 py-1 rounded-full border border-[#333]">
                        {format(new Date(message.date), 'dd MMM yyyy, HH:mm')}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#0B0E14]/30 text-gray-300 custom-scrollbar">
                {viewMode === 'visual' ? (
                    message.html ? (
                        <div
                            className="prose prose-invert max-w-none prose-a:text-[#00FF94] prose-headings:text-white"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.html) }}
                        />
                    ) : (
                        <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">
                            {message.text}
                        </pre>
                    )
                ) : (
                    <div className="relative group">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="bg-[#00FF94] text-black text-xs px-2 py-1 rounded font-bold">Copiar JSON</button>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-xs text-[#00FF94] bg-[#050505] p-6 rounded-xl border border-[#333] shadow-inner">
                            {JSON.stringify(message, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[#ffffff05] bg-[#0B0E14]/90 backdrop-blur-xl space-y-4">

                {/* View Toggle */}
                <div className="flex bg-[#151A23] p-1 rounded-lg w-full max-w-md mx-auto">
                    <button
                        onClick={() => setViewMode('visual')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'visual' ? 'bg-[#00FF94] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Eye className="w-4 h-4" /> Visual
                        </div>
                    </button>
                    <button
                        onClick={() => setViewMode('raw')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'raw' ? 'bg-[#00FF94] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Code className="w-4 h-4" /> Código-fonte
                        </div>
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-2">
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors px-4 py-2 rounded-lg hover:bg-[#ffffff05]"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar para Inbox
                    </button>

                    <div className="flex gap-2">
                        <button className="border border-[#333] hover:border-[#00FF94] text-gray-400 hover:text-[#00FF94] rounded-lg p-2 transition-all" title="Baixar">
                            <Download className="w-5 h-5" />
                        </button>
                        <button className="border border-[#333] hover:border-[#00FF94] text-gray-400 hover:text-[#00FF94] rounded-lg p-2 transition-all" title="Expandir">
                            <Maximize2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
