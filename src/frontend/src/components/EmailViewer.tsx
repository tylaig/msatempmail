'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { ArrowLeft, Download, Copy, Maximize2, Code, Eye, Check } from 'lucide-react';

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

// Função para parsear o conteúdo do email dos headers
function parseEmailContent(message: FullMessage): { html: string; text: string } {
    let html = message.html || '';
    let text = message.text || '';

    // Limpa o HTML/texto de caracteres de controle e espaços extras
    if (html) {
        html = html.trim();
    }
    if (text) {
        text = text.trim();
    }

    // Se não temos conteúdo, tenta extrair dos headers (último recurso)
    // Normalmente o backend já deve ter parseado, mas caso não tenha...
    if (!html && !text && message.headers) {
        try {
            // Headers pode ser uma string JSON ou objeto
            const headers = typeof message.headers === 'string' 
                ? JSON.parse(message.headers) 
                : message.headers;

            // Se o content-type indica multipart, o conteúdo real deve estar no body
            // Mas como não temos acesso ao body raw aqui, vamos confiar no backend
            // Esta é apenas uma camada de segurança
        } catch (e) {
            console.error('Error parsing headers:', e);
        }
    }

    // Limpa o subject se tiver quebras de linha (já deve estar limpo pelo backend)
    if (message.subject) {
        message.subject = message.subject.replace(/\n/g, ' ').trim();
    }

    return { html, text };
}

export function EmailViewer({ messageId, onBack }: EmailViewerProps) {
    const [message, setMessage] = useState<FullMessage | null>(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');
    const [copied, setCopied] = useState(false);
    const [copiedText, setCopiedText] = useState(false);

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

    const handleCopyJSON = async () => {
        if (!message) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(message, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy:', e);
        }
    };

    const handleCopyText = async () => {
        if (!message) return;
        try {
            const { html, text } = parseEmailContent(message);
            let textToCopy = text || '';
            
            // Se temos HTML mas não texto, extrai texto do HTML
            if (html && !text) {
                // Cria um elemento temporário para extrair texto
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
                textToCopy = tempDiv.textContent || tempDiv.innerText || '';
            } else if (html && text) {
                // Se temos ambos, preferimos o texto
                textToCopy = text;
            }
            
            if (!textToCopy) {
                textToCopy = 'Sem conteúdo disponível';
            }
            
            await navigator.clipboard.writeText(textToCopy);
            setCopiedText(true);
            setTimeout(() => setCopiedText(false), 2000);
        } catch (e) {
            console.error('Failed to copy text:', e);
        }
    };

    if (loading || !message) {
        return (
            <div className="flex items-center justify-center h-full text-[#00FF94]">
                <div className="w-12 h-12 border-4 border-[#00FF94] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const { html, text } = parseEmailContent(message);
    const hasContent = html || text;
    const displayHtml = html || '';
    const displayText = text || '';

    return (
        <div className="flex flex-col h-full bg-[#0B0E14]/80 backdrop-blur-md">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[#ffffff05] bg-[#0B0E14]/50">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="bg-[#151A23] border border-[#333] rounded-xl p-4 w-full shadow-lg">
                        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 leading-tight break-words">
                            {message.subject || '(Sem Assunto)'}
                        </h2>

                        <div className="flex flex-col gap-2 text-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <span className="text-gray-500 font-medium sm:w-12">De:</span>
                                <span className="text-[#00FF94] font-mono bg-[#00FF94]/10 px-2 py-0.5 rounded break-all">
                                    {message.from}
                                </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <span className="text-gray-500 font-medium sm:w-12">Para:</span>
                                <span className="text-gray-300 font-mono break-all">{message.to}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono whitespace-nowrap bg-[#151A23] px-3 py-2 rounded-full border border-[#333] self-start sm:self-auto">
                        {format(new Date(message.date), 'dd MMM yyyy, HH:mm')}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0B0E14]/30 text-gray-300 custom-scrollbar">
                {viewMode === 'visual' ? (
                    hasContent ? (
                        <div className="relative">
                            {displayHtml ? (
                                <div
                                    className="prose prose-invert max-w-none prose-a:text-[#00FF94] prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-code:text-[#00FF94] prose-pre:bg-[#151A23] prose-pre:border prose-pre:border-[#333] prose-pre:rounded-lg prose-img:rounded-lg prose-img:max-w-full"
                                    style={{
                                        color: '#d1d5db',
                                    }}
                                    dangerouslySetInnerHTML={{ 
                                        __html: DOMPurify.sanitize(displayHtml, {
                                            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'pre', 'code', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
                                            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
                                            ALLOW_DATA_ATTR: false,
                                        })
                                    }}
                                />
                            ) : (
                                <div className="relative group">
                                    <button
                                        onClick={handleCopyText}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-[#00FF94] text-black text-xs px-3 py-1.5 rounded font-bold flex items-center gap-1.5 hover:bg-[#00FF94]/90"
                                    >
                                        {copiedText ? (
                                            <>
                                                <Check className="w-3 h-3" /> Copiado!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" /> Copiar
                                            </>
                                        )}
                                    </button>
                                    <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed bg-[#151A23] p-4 rounded-lg border border-[#333]">
                                        {displayText}
                                    </pre>
                                </div>
                            )}
                            {displayHtml && (
                                <button
                                    onClick={handleCopyText}
                                    className="mt-4 bg-[#00FF94] text-black text-sm px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#00FF94]/90 transition-colors"
                                >
                                    {copiedText ? (
                                        <>
                                            <Check className="w-4 h-4" /> Texto copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" /> Copiar texto
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <p className="text-lg mb-2">Sem conteúdo disponível</p>
                                <p className="text-sm">Este email não possui conteúdo de texto ou HTML.</p>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="relative group">
                        <button
                            onClick={handleCopyJSON}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-[#00FF94] text-black text-xs px-3 py-1.5 rounded font-bold flex items-center gap-1.5 hover:bg-[#00FF94]/90"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3 h-3" /> Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3 h-3" /> Copiar JSON
                                </>
                            )}
                        </button>
                        <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-[#00FF94] bg-[#050505] p-4 sm:p-6 rounded-xl border border-[#333] shadow-inner overflow-x-auto">
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
                            <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Visual</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setViewMode('raw')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'raw' ? 'bg-[#00FF94] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Code className="w-4 h-4" /> <span className="hidden sm:inline">Código-fonte</span>
                        </div>
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors px-4 py-2 rounded-lg hover:bg-[#ffffff05] w-full sm:w-auto justify-center"
                    >
                        <ArrowLeft className="w-4 h-4" /> <span>Voltar para Inbox</span>
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
