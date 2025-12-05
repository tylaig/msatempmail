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
    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const wsUrl = apiUrl.replace(/^http/, 'ws') + `/ws/inbox/${email}`;
        const ws = new WebSocket(wsUrl);

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

        return () => {
            ws.close();
        };
    }, [email]);

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <Box className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-xl font-bold text-white mb-2">Nenhum e-mail ainda</h3>
                <p className="max-w-xs text-center text-sm">
                    Estamos ouvindo... qualquer mensagem que chegar aparece aqui em segundos.
                </p>
                <button
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    className="mt-6 bg-[#00FF94] text-black font-bold py-2 px-6 rounded-full text-sm hover:bg-[#00cc76]"
                >
                    Atualizar agora
                </button>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <div className="flex flex-col gap-2">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        onClick={() => onSelectMessage(msg.id)}
                        className="group flex items-center bg-[#0B0E14]/40 border border-gray-800 hover:border-[#00FF94]/50 rounded-lg p-4 cursor-pointer transition-all hover:bg-[#0B0E14]/80"
                    >
                        <div className="w-10 flex-shrink-0">
                            <Mail className="w-5 h-5 text-gray-500 group-hover:text-[#00FF94]" />
                        </div>

                        <div className="w-1/4 min-w-[150px] pr-4">
                            <div className="font-medium text-gray-300 truncate text-sm">{msg.from}</div>
                        </div>

                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm truncate">{msg.subject || '(Sem Assunto)'}</span>
                                <span className="text-gray-600 text-xs hidden md:inline">-</span>
                                <span className="text-gray-500 text-xs truncate hidden md:inline">{msg.text ? msg.text.substring(0, 60) : ''}...</span>
                            </div>
                        </div>

                        <div className="w-24 text-right flex-shrink-0">
                            <span className="text-xs text-gray-400 font-mono">
                                {format(new Date(msg.date), 'hh:mm a')}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
