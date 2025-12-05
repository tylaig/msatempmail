'use client';

import { useState, useEffect } from 'react';
import { Inbox } from '@/components/Inbox';
import { EmailViewer } from '@/components/EmailViewer';
import { Copy, RefreshCw, Rocket, Trash2 } from 'lucide-react';

export default function Home() {
  const [email, setEmail] = useState<string | null>(null);
  const [ttl, setTtl] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
  const [loading, setLoading] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const [customName, setCustomName] = useState('');

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('msamail_email');
    const savedExpiry = localStorage.getItem('msamail_expiry');

    if (savedEmail && savedExpiry) {
      const expiryTime = parseInt(savedExpiry, 10);
      const now = Date.now();
      const remainingSeconds = Math.floor((expiryTime - now) / 1000);

      if (remainingSeconds > 0) {
        setEmail(savedEmail);
        setTtl(remainingSeconds);
      } else {
        // Expired, clear it
        localStorage.removeItem('msamail_email');
        localStorage.removeItem('msamail_expiry');
      }
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (!ttl) return;

    // Calculate expiry time based on when we got the TTL
    // In a real app, we'd get the absolute expiry timestamp from server
    const expiryTime = Date.now() + (ttl * 1000);

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft('00:00:00');
        setIsExpired(true);
        localStorage.removeItem('msamail_email'); // Clear on expire
        localStorage.removeItem('msamail_expiry');
        return;
      }

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [ttl]);

  const generateEmail = async () => {
    setLoading(true);
    setIsExpired(false);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/mailbox/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customName: customName || undefined })
      });
      const data = await res.json();

      setEmail(data.address);
      setTtl(data.ttl); // Reset TTL
      setSelectedMessageId(null);

      // Save to LocalStorage
      const expiryTimestamp = Date.now() + (data.ttl * 1000);
      localStorage.setItem('msamail_email', data.address);
      localStorage.setItem('msamail_expiry', expiryTimestamp.toString());

    } catch (error) {
      console.error('Failed to generate email', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (email) {
      navigator.clipboard.writeText(email);
    }
  };

  const deleteMailbox = () => {
    setEmail(null);
    setTtl(null);
    setSelectedMessageId(null);
    setIsExpired(false);
    localStorage.removeItem('msamail_email');
    localStorage.removeItem('msamail_expiry');
  }

  return (
    <main className="min-h-screen bg-[#0B0E14] text-white font-sans flex flex-col items-center">
      {/* Header */}
      <header className="w-full p-6 flex justify-center items-center">
        <div className="flex items-center gap-2">
          <Rocket className="w-6 h-6 text-[#00FF94]" />
          <span className="text-xl font-bold text-white">Meu Super App</span>
        </div>
      </header>

      <div className="container max-w-5xl px-4 py-8 space-y-8">

        {/* Generator Box */}
        {!email || isExpired ? (
          // Empty/Expired State or Initial State
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-8">
            {isExpired ? (
              <div className="bg-[#151A23] p-12 rounded-2xl border border-gray-800 text-center max-w-lg shadow-2xl">
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                    <span className="text-6xl">😓</span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-4">Este e-mail temporário expirou</h2>
                <p className="text-gray-400 mb-8">
                  O link ou e-mail temporário que você está tentando acessar não está mais disponível.
                </p>
                <button
                  onClick={generateEmail}
                  className="bg-[#00FF94] hover:bg-[#00cc76] text-black font-bold py-3 px-8 rounded-lg transition-all w-full"
                >
                  Criar novo e-mail
                </button>
              </div>
            ) : (
              <div className="text-center space-y-8 w-full max-w-md">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-4 border-[#00FF94]/20 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 border-4 border-[#00FF94] rounded-full flex items-center justify-center">
                    <div className="w-16 h-16 bg-[#00FF94] rounded-full opacity-20"></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#151A23] p-2 rounded-xl border border-gray-800 flex items-center w-full">
                    <input
                      type="text"
                      placeholder="Nome personalizado (opcional)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="bg-transparent text-white w-full px-4 py-2 outline-none placeholder-gray-600"
                    />
                  </div>

                  <button
                    onClick={generateEmail}
                    disabled={loading}
                    className="w-full bg-[#00FF94] hover:bg-[#00cc76] text-black font-bold py-4 rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(0,255,148,0.3)]"
                  >
                    {loading ? 'Gerando...' : 'Gerar E-mail Temporário'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Active State Header */}
            <div className="bg-[#151A23] border border-[#00FF94]/30 rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(0,255,148,0.05)] relative overflow-hidden">
              {/* Glow effect */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00FF94] to-transparent opacity-50"></div>

              <div className="flex items-center gap-4 bg-[#0B0E14] px-6 py-3 rounded-lg border border-gray-800 w-full md:w-auto flex-1">
                <span className="text-xl md:text-2xl font-mono text-white truncate">{email}</span>
                <button
                  onClick={copyToClipboard}
                  className="bg-[#00FF94] hover:bg-[#00cc76] text-black p-2 rounded-md transition-colors ml-auto"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[#00FF94] font-mono text-2xl tracking-widest">TTL: {timeLeft}</span>
                <div className="w-10 h-10 rounded-full border-4 border-[#00FF94] border-t-transparent animate-spin"></div>
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-[#151A23] rounded-2xl border border-gray-800 overflow-hidden min-h-[500px] flex flex-col relative">
              {selectedMessageId ? (
                <EmailViewer
                  messageId={selectedMessageId}
                  onBack={() => setSelectedMessageId(null)}
                />
              ) : (
                <>
                  <div className="p-4 border-b border-gray-800 text-[#00FF94] text-sm font-medium flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-[#00FF94] rounded-full animate-pulse"></span>
                    Aguardando novos e-mails...
                  </div>
                  <Inbox
                    email={email}
                    onSelectMessage={setSelectedMessageId}
                    selectedId={selectedMessageId}
                  />

                  {/* Footer Actions */}
                  <div className="p-4 border-t border-gray-800 flex justify-between items-center bg-[#0B0E14]/50">
                    <button
                      onClick={generateEmail}
                      className="border border-[#00FF94] text-[#00FF94] px-6 py-2 rounded-lg text-sm hover:bg-[#00FF94]/10 transition-colors"
                    >
                      GERAR NOVO ENDEREÇO →
                    </button>

                    <button
                      onClick={deleteMailbox}
                      className="bg-[#1E293B] text-gray-400 px-4 py-2 rounded-lg text-sm hover:text-white hover:bg-red-900/30 transition-colors flex items-center gap-2"
                    >
                      APAGAR CAIXA <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
