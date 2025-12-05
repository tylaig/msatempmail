'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
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
                const res = await fetch(`http://localhost:3000/message/${messageId}`);
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00FF94]"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#151A23]">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 bg-[#0B0E14]/50">
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-gray-800/50 rounded-lg px-4 py-2 w-full">
                        <div className="flex gap-2 text-sm mb-1">
                            <span className="text-gray-500 font-bold">De:</span>
                            <span className="text-gray-300">{message.from}</span>
                        </div>
                        <div className="flex gap-2 text-sm mb-1">
                            <span className="text-gray-500 font-bold">Para:</span>
                            <span className="text-gray-300">{message.to}</span>
                        </div>
                        <div className="flex gap-2 text-sm">
                            <span className="text-gray-500 font-bold">Assunto:</span>
                            <span className="text-white font-medium">{message.subject}</span>
                        </div>
                    </div>
                    <div className="ml-4 text-xs text-gray-500 font-mono whitespace-nowrap pt-2">
                        Data: {format(new Date(message.date), 'dd de MMMM, yyyy, HH:mm')}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#151A23] text-gray-300">
                {viewMode === 'visual' ? (
                    message.html ? (
                        <div
                            className="prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: message.html }}
                        />
                    ) : (
                        <pre className="whitespace-pre-wrap font-sans text-gray-300">
                            {message.text}
                        </pre>
                    )
                ) : (
                    <pre className="whitespace-pre-wrap font-mono text-xs text-green-400 bg-black p-4 rounded-lg border border-gray-800">
                        {JSON.stringify(message, null, 2)}
                    </pre>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-800 bg-[#0B0E14] space-y-4">

                {/* View Toggle */}
                <div className="flex border border-gray-700 rounded-lg overflow-hidden w-full">
                    <button
                        onClick={() => setViewMode('visual')}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${viewMode === 'visual' ? 'bg-[#00FF94]/10 text-[#00FF94] border-b-2 border-[#00FF94]' : 'text-gray-400 hover:bg-gray-800'}`}
                    >
                        Visual
                    </button>
                    <button
                        onClick={() => setViewMode('raw')}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${viewMode === 'raw' ? 'bg-[#00FF94]/10 text-[#00FF94] border-b-2 border-[#00FF94]' : 'text-gray-400 hover:bg-gray-800'}`}
                    >
                        Código-fonte (RAW)
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-4 gap-4">
                    <button
                        onClick={onBack}
                        className="col-span-1 border border-[#00FF94] text-[#00FF94] rounded-lg py-2 flex items-center justify-center gap-2 text-sm hover:bg-[#00FF94]/10 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>

                    <button className="col-span-1 border border-[#00FF94] text-[#00FF94] rounded-lg py-2 flex items-center justify-center gap-2 text-sm hover:bg-[#00FF94]/10 transition-colors">
                        <Download className="w-4 h-4" /> Baixar
                    </button>

                    <button className="col-span-1 border border-[#00FF94] text-[#00FF94] rounded-lg py-2 flex items-center justify-center gap-2 text-sm hover:bg-[#00FF94]/10 transition-colors">
                        <Copy className="w-4 h-4" /> Copiar
                    </button>

                    <button className="col-span-1 border border-[#00FF94] text-[#00FF94] rounded-lg py-2 flex items-center justify-center gap-2 text-sm hover:bg-[#00FF94]/10 transition-colors">
                        <Maximize2 className="w-4 h-4" /> Expandir
                    </button>
                </div>
            </div>
        </div>
    );
}
