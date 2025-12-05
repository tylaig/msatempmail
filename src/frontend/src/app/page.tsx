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
    <main className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00FF94] rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#00FF94] rounded-full blur-[150px] opacity-5 pointer-events-none"></div>

      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center container max-w-6xl z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00FF94] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,255,148,0.3)]">
            <Rocket className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-bold text-white font-heading tracking-tight">MSAMail</span>
        </div>
        <button className="bg-[#121212] border border-[#333] hover:border-[#00FF94] text-sm px-4 py-2 rounded-full transition-colors">
          Começar Grátis
        </button>
      </header>

      <div className="container max-w-6xl px-4 py-12 flex-1 flex flex-col z-10">

        {!email || isExpired ? (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 mt-8">
            {/* Hero Text */}
            <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
              <h1 className="text-5xl lg:text-7xl font-bold font-heading leading-tight text-balance">
                Gerar E-mail <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF94] to-[#00cc76] text-glow">Temporário</span>
              </h1>
              <p className="text-gray-400 text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Crie um endereço de e-mail temporário e anônimo instantaneamente para proteger sua privacidade e evitar spam indesejado.
              </p>

              <button
                onClick={generateEmail}
                className="bg-[#00FF94] hover:bg-[#00cc76] text-black font-bold text-lg py-4 px-10 rounded-full transition-all shadow-[0_0_20px_rgba(0,255,148,0.4)] hover:shadow-[0_0_30px_rgba(0,255,148,0.6)] hover:scale-105 active:scale-95"
              >
                {loading ? 'Gerando...' : 'Gerar Agora'}
              </button>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 pt-8">
                <div className="flex items-center gap-2 bg-[#121212] border border-[#222] px-4 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-[#00FF94] rounded-full"></div>
                  <span className="text-sm font-medium">100% Privacidade</span>
                </div>
                <div className="flex items-center gap-2 bg-[#121212] border border-[#222] px-4 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-[#00FF94] rounded-full"></div>
                  <span className="text-sm font-medium">Entrega Instantânea</span>
                </div>
              </div>
            </div>

            {/* Generator Card */}
            <div className="lg:w-1/2 w-full">
              <div className="glass-panel p-1 rounded-3xl box-glow">
                <div className="bg-[#050505]/80 backdrop-blur-xl rounded-[22px] p-8 border border-[#ffffff05]">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">SECURE CONNECTION</div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block ml-1">Personalizar (Opcional)</label>
                      <div className="bg-[#121212] p-4 rounded-xl border border-[#333] focus-within:border-[#00FF94] transition-colors flex items-center">
                        <input
                          type="text"
                          placeholder="ex: meu-nome"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="bg-transparent text-white w-full outline-none placeholder-gray-600 font-mono"
                        />
                        <span className="text-gray-500 select-none">@mail.orbvia.co</span>
                      </div>
                    </div>

                    <div className="bg-[#121212] p-6 rounded-xl border border-[#333] flex items-center justify-between group cursor-pointer hover:border-[#00FF94]/50 transition-all" onClick={generateEmail}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#00FF94]/10 flex items-center justify-center text-[#00FF94]">
                          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </div>
                        <div>
                          <div className="text-white font-medium">Gerar Aleatório</div>
                          <div className="text-xs text-gray-500">Clique para criar instantaneamente</div>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center group-hover:bg-[#00FF94] group-hover:text-black transition-colors">
                        →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Active State Header */}
            <div className="glass-panel rounded-2xl p-6 mb-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00FF94] to-transparent opacity-50"></div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 w-full md:w-auto">
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Seu E-mail Temporário</label>
                  <div className="flex items-center gap-4 bg-[#050505]/50 p-4 rounded-xl border border-[#ffffff10] group-hover:border-[#00FF94]/30 transition-colors">
                    <span className="text-xl md:text-2xl font-mono text-white truncate flex-1">{email}</span>
                    <button
                      onClick={copyToClipboard}
                      className="bg-[#00FF94] hover:bg-[#00cc76] text-black px-4 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" /> Copiar
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-6 bg-[#050505]/30 px-6 py-4 rounded-xl border border-[#ffffff05]">
                  <div className="text-right">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Expira em</div>
                    <div className="text-[#00FF94] font-mono text-2xl font-bold tabular-nums">{timeLeft}</div>
                  </div>
                  <div className="relative w-12 h-12">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="24" cy="24" r="20" stroke="#333" strokeWidth="4" fill="transparent" />
                      <circle cx="24" cy="24" r="20" stroke="#00FF94" strokeWidth="4" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 * (1 - (ttl || 0) / 900)} className="transition-all duration-1000 ease-linear" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="glass-panel rounded-2xl overflow-hidden min-h-[600px] flex flex-col relative shadow-2xl">
              {selectedMessageId ? (
                <EmailViewer
                  messageId={selectedMessageId}
                  onBack={() => setSelectedMessageId(null)}
                />
              ) : (
                <>
                  <Inbox
                    email={email}
                    onSelectMessage={setSelectedMessageId}
                    selectedId={selectedMessageId}
                  />

                  {/* Footer Actions */}
                  <div className="p-4 border-t border-[#ffffff05] flex justify-between items-center bg-[#050505]/50 backdrop-blur-md">
                    <button
                      onClick={generateEmail}
                      className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Gerar Novo
                    </button>

                    <button
                      onClick={deleteMailbox}
                      className="text-red-500 hover:text-red-400 text-sm flex items-center gap-2 transition-colors px-4 py-2 rounded-lg hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" /> Apagar Caixa
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Feature Grid (Only show on home) */}
        {(!email || isExpired) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            {[
              { title: 'Criar em 2 segundos', desc: 'Gere novos endereços de e-mail com apenas um clique.', icon: '⚡' },
              { title: 'Mensagens em Tempo Real', desc: 'Visualize mensagens instantaneamente via WebSocket.', icon: '📨' },
              { title: 'Proteção Anti-Spam', desc: 'Mantenha sua caixa principal limpa de lixo eletrônico.', icon: '🛡️' },
            ].map((feature, i) => (
              <div key={i} className="glass-panel p-6 rounded-2xl hover:bg-[#ffffff05] transition-colors group">
                <div className="w-12 h-12 bg-[#00FF94]/10 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
