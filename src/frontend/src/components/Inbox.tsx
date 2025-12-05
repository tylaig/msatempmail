'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Mail, Box } from 'lucide-react';

interface Message {
    id: string;
    from: string;
    subject: string;
    text: string;
    date: string;
}

interface InboxProps {
    email: string;
    onSelectMessage: (id: string) => void;
    selectedId: string | null;
}

export function Inbox({ email, onSelectMessage, selectedId }: InboxProps) {
    const [messages, setMessages] = useState<Message[]>([]);

    const [refreshKey, setRefreshKey] = useState(0);

    // Initial fetch
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                const res = await fetch(`${apiUrl}/mailbox/${email}`);
                const data = await res.json();
                if (data.messages) {
                    setMessages(data.messages);
                }
            } catch (e) {
                console.error('Failed to fetch messages', e);
            }
        };
        fetchMessages();
    }, [email, refreshKey]);

    // WebSocket connection
    const [isConnected, setIsConnected] = useState(false);

    // WebSocket connection
    useEffect(() => {
        if (!email) return;

        let ws: WebSocket | null = null;
        let reconnectTimer: NodeJS.Timeout;
        let isMounted = true;

        const connect = () => {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const wsUrl = apiUrl.replace(/^http/, 'ws') + `/ws/inbox/${email}`;

            console.log('Connecting to WS:', wsUrl);
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                if (isMounted) setIsConnected(true);
                console.log('WS Connected');
            };

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.type === 'NEW_EMAIL') {
                        setMessages((prev) => [payload.data, ...prev]);
                    }
                } catch (e) {
                    console.error('WS message parse error', e);
                }
            };

            ws.onclose = () => {
                if (isMounted) setIsConnected(false);
                console.log('WS Closed. Reconnecting in 3s...');
                reconnectTimer = setTimeout(() => {
                    if (isMounted) connect();
                }, 3000);
            };

            ws.onerror = () => {
                // Silent error, reconnection will handle it
                ws?.close();
            };
        };

        connect();

        return () => {
            isMounted = false;
            if (ws) ws.close();
            clearTimeout(reconnectTimer);
        };
    }, [email]);

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 min-h-[400px]">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-[#00FF94] blur-xl opacity-10 rounded-full animate-pulse"></div>
                    <Box className="w-20 h-20 text-gray-700 relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 font-heading">Sua caixa está vazia</h3>
                <p className="max-w-xs text-center text-gray-400 mb-8 leading-relaxed">
                    Aguardando mensagens... assim que chegarem, aparecerão aqui automaticamente.
                </p>
                {!isConnected && (
                    <div className="mt-2 text-xs text-yellow-500 flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                        Reconectando ao servidor...
                    </div>
                )}
                <button
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    className="mt-6 border border-[#333] hover:border-[#00FF94] text-gray-400 hover:text-[#00FF94] font-medium py-2 px-6 rounded-full text-sm transition-all"
                >
                    Verificar manualmente
                </button>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {messages.map((msg) => (
                <div
                    key={msg.id}
                    onClick={() => onSelectMessage(msg.id)}
                    className="group flex items-center bg-[#0B0E14]/60 border border-[#ffffff05] hover:border-[#00FF94]/30 rounded-xl p-4 cursor-pointer transition-all hover:bg-[#0B0E14] hover:shadow-[0_0_20px_rgba(0,255,148,0.05)] relative overflow-hidden"
                >
                    {/* Hover Glow */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00FF94] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="w-12 h-12 rounded-full bg-[#151A23] flex items-center justify-center flex-shrink-0 mr-4 border border-[#333] group-hover:border-[#00FF94] transition-colors">
                        <Mail className="w-5 h-5 text-gray-400 group-hover:text-[#00FF94] transition-colors" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex justify-between items-baseline mb-1">
                            <h4 className="font-bold text-white truncate text-base group-hover:text-[#00FF94] transition-colors">{msg.from}</h4>
                            <span className="text-xs text-gray-500 font-mono flex-shrink-0 ml-2">
                                {format(new Date(msg.date), 'HH:mm')}
                            </span>
                        </div>
                        <div className="text-sm text-gray-300 font-medium truncate mb-0.5">
                            {msg.subject || '(Sem Assunto)'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                            {msg.text ? msg.text.substring(0, 80) : 'Sem visualização disponível'}...
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
