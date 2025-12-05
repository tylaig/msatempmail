# MSAMail - Plataforma de E-mails Temporários

**MSAMail** é uma solução completa e *self-hosted* para criação de e-mails temporários descartáveis. O sistema oferece um servidor SMTP real, API RESTful de alta performance e uma interface web moderna com atualizações em tempo real via WebSocket.

Ideal para testes de QA, privacidade ou integração com outros sistemas que necessitam de recebimento de e-mails sob demanda.

---

## 🚀 Tecnologias

O projeto é construído sobre uma stack moderna focada em performance e escalabilidade:

*   **SMTP Server**: [Haraka](https://haraka.github.io/) (Node.js) - Altamente extensível e performático.
*   **Backend API**: [Bun](https://bun.sh/) + [ElysiaJS](https://elysiajs.com/) - API extremamente rápida.
*   **Database**: [Redis](https://redis.io/) - Armazenamento volátil (TTL) e Pub/Sub para eventos.
*   **Frontend**: [Next.js 15](https://nextjs.org/) + [TailwindCSS](https://tailwindcss.com/) - Interface reativa e moderna.
*   **Infra**: Docker & Docker Compose.

---

## 🏗️ Arquitetura

1.  **Haraka (Porta 25)**: Recebe o e-mail, processa plugins (DKIM, SPF, SpamAssassin) e envia o conteúdo para a API.
2.  **API (Porta 3001)**:
    *   Recebe o e-mail do Haraka (rota interna protegida).
    *   Armazena no Redis com TTL (tempo de vida).
    *   Publica evento de "Novo E-mail" no Redis Pub/Sub.
3.  **Redis**: Gerencia a persistência temporária e a comunicação em tempo real.
4.  **Frontend (Porta 3030)**:
    *   Conecta via WebSocket na API.
    *   Exibe novos e-mails instantaneamente assim que chegam.

---

## 🛠️ Instalação e Uso

### Pré-requisitos
*   Docker e Docker Compose instalados.
*   Portas 25, 3001 e 3030 livres.

### Rodando com Docker (Recomendado)

1.  Clone o repositório:
    ```bash
    git clone https://github.com/seu-usuario/msamail.git
    cd msamail
    ```

2.  Suba os containers:
    ```bash
    sudo docker-compose up -d --build
    ```

3.  Acesse a aplicação:
    *   **Frontend**: [http://localhost:3030](http://localhost:3030)
    *   **API Swagger**: [http://localhost:3001/swagger](http://localhost:3001/swagger)

---

## ⚙️ Configuração

### 1. Domínios Aceitos
Edite o arquivo `haraka/config/host_list` para definir quais domínios seu servidor aceitará:
```text
localhost
seu-dominio.com
inbox.seu-dominio.com
```

### 2. DNS (Produção)
Para receber e-mails na internet real, configure seu DNS conforme o guia detalhado em [SMTP_CONFIGURATION_GUIDE.md](./SMTP_CONFIGURATION_GUIDE.md).

Resumo dos registros necessários:
*   **A**: `mail.seu-dominio.com` -> `SEU_IP`
*   **MX**: `@` -> `mail.seu-dominio.com`

### 3. DKIM & Segurança
O projeto já vem configurado para assinar e-mails com DKIM.
*   As chaves ficam em `haraka/config/dkim/`.
*   A chave pública para o DNS está em `haraka/config/dkim/public.key`.

---

## 🔌 API Endpoints

A API roda na porta **3001**. Documentação completa no `/swagger`.

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/mailbox/create` | Cria uma nova caixa temporária. |
| `GET` | `/mailbox/:address` | Lista mensagens de uma caixa. |
| `GET` | `/message/:id` | Obtém detalhes de uma mensagem. |
| `WS` | `/ws/inbox/:address` | WebSocket para receber e-mails em tempo real. |
| `POST` | `/internal/save-email` | **(Interno)** Webhook usado pelo Haraka. Requer Auth. |

---

## 📂 Estrutura de Pastas

```
.
├── docker-compose.yml      # Orquestração dos containers
├── haraka/                 # Servidor SMTP
│   ├── config/             # Configurações (host_list, plugins, dkim)
│   └── plugins/            # Plugins customizados (save_to_api.js)
└── src/
    ├── api/                # Backend (Elysia + Bun)
    │   ├── index.ts        # Entrypoint
    │   └── routes/         # Rotas da API
    └── frontend/           # Interface (Next.js)
        ├── src/app/        # Páginas
        └── src/components/ # Componentes React (Inbox, Viewer)
```

---

## 🐛 Troubleshooting

**Erro: Porta 25 em uso**
Muitos provedores de internet bloqueiam a porta 25 residencial. Para testar localmente, use `telnet localhost 25`. Em produção, use uma VPS (Hetzner, DigitalOcean, AWS) com porta 25 liberada.

**Erro: API não recebe e-mail**
Verifique os logs do Haraka:
```bash
sudo docker-compose logs -f haraka
```
Certifique-se de que o token em `haraka/config/save_to_api.ini` bate com o esperado na API.

---

## 📄 Licença
MIT
