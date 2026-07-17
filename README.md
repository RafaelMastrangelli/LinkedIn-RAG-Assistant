# 🚀 LinkedIn Job Bot - Telegram Notifier

Um bot inteligente escrito em **TypeScript** e **Node.js** que faz web scraping no LinkedIn em busca das melhores vagas de programação, filtra vagas lixo (promovidas, low-code, stacks não desejadas) e envia notificações diretamente para o seu celular via **Telegram**.

## ✨ Funcionalidades

- **Scraping Orgânico:** Usa o Playwright para buscar as vagas como um humano, acessando as URLs de busca sem precisar de APIs pagas do LinkedIn.
- **Filtro de Vagas Promovidas:** Ignora automaticamente anúncios pagos (`Promoted` / `Recrutando ativamente`), garantindo que você veja apenas vagas orgânicas e reais.
- **Múltiplos Termos:** Busca paralelamente por múltiplos cargos (ex: `Desenvolvedor`, `Analista de Sistemas`).
- **Bloqueio de Stacks/Senioridade:** Filtro rigoroso com Regex para barrar vagas que contenham requisitos de linguagens não desejadas (como Java, PHP, Ruby, etc.), cargos C-Level/Seniores, ou níveis muito iniciais (Estágio).
- **Banco de Dados Anti-Spam:** Utiliza **SQLite** local para salvar as vagas já enviadas. Você nunca receberá a mesma vaga duas vezes.
- **Filtro Estrito de Modelo:** Para buscas nacionais, ele garante que apenas vagas **100% Remotas** sejam enviadas.
- **Docker Ready:** Preparado para rodar na nuvem 24/7 de forma extremamente leve e autônoma.

## 🛠️ Tecnologias Utilizadas

- **[TypeScript](https://www.typescriptlang.org/) / Node.js:** Lógica do sistema.
- **[Playwright](https://playwright.dev/):** Automação do navegador Chrome/Chromium para extrair o HTML.
- **[Cheerio](https://cheerio.js.org/):** Para parseamento rápido de HTML.
- **[node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api):** Integração para o envio das mensagens.
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3):** Banco de dados relacional super rápido (em disco) para registro de vagas.
- **[node-cron](https://github.com/node-cron/node-cron):** Agendador de tarefas para rodar o bot de hora em hora.

---

## ⚙️ Como Configurar e Rodar Localmente

### 1. Clonar e Instalar
```bash
git clone https://github.com/seu-usuario/linkedin-job-bot.git
cd linkedin-job-bot
npm install
```

### 2. Configurar as Variáveis de Ambiente
Renomeie o arquivo de exemplo:
```bash
cp .env.example .env
```
Abra o arquivo `.env` e preencha as variáveis:
- `TELEGRAM_TOKEN`: O Token do seu bot criado no [BotFather](https://t.me/BotFather) do Telegram.
- `TELEGRAM_CHAT_ID`: O seu ID pessoal do Telegram (você pode descobrir o seu mandando `/getid` para o @userinfobot).
- `SEARCH_KEYWORDS`: Os termos que você quer pesquisar separados por vírgula (Ex: `Desenvolvedor,Analista de Sistemas,Software Engineer`).

### 3. Rodar o Bot (Teste Único)
Para testar se tudo está funcionando e enviar as primeiras vagas para o seu Telegram:
```bash
# Compilar o TypeScript
npm run build

# Rodar o bot uma única vez
npm run dev:once
```

### 4. Rodar Continuamente (Em Background)
Para deixar rodando a cada 1 hora no seu terminal local:
```bash
npm run dev:bot
```

### 5. Dashboard de Vagas (Next.js + Shadcn/UI)
Para listar as vagas salvas e marcar status (`nova` / `aplicado` / `descartado`):
```bash
npm run dev:dashboard
```
Abra [http://localhost:3000](http://localhost:3000). A página usa ISR (revalidate 60s) e invalida o cache ao mudar o status.

### 6. Planos de estudo (scrape + LLM)
1. Configure no `.env`:
   - `GROQ_API_KEY`
   - `LLM_MODEL` (opcional, padrão `llama-3.3-70b-versatile`)
   - `CANDIDATE_PROFILE` (seu perfil/stacks)
2. No dashboard, anexe seu currículo (PDF/TXT) no card **Currículo**.
3. Marque **Apliquei** (dispara scrape + geração em background) ou abra **Plano** na vaga.
4. Em `/vagas/[id]`, use **Gerar plano** / **Scrape + gerar**, ou cole a descrição manual se o LinkedIn bloquear.

Para rodar os testes do repositório:
```bash
npm test
```

---

## 🐳 Como Hospedar com Docker (Recomendado para VPS)

Se você tem um Servidor Virtual Privado (VPS) na **Oracle Cloud, Hetzner, DigitalOcean ou AWS**, pode rodar o bot de forma invisível via Docker. O banco de dados (`jobs.db`) ficará salvo localmente dentro da pasta `data/` usando volumes.

1. Preencha o seu `.env`.
2. Rode o comando do Docker Compose:
```bash
docker-compose up --build -d
```
O bot vai instalar todas as dependências do Playwright, ligar e ficar rodando para sempre. Para ver os logs, digite: `docker-compose logs -f`.

---

## 📝 Customizando a Lista de Exclusão (Filtros)

Para ajustar quais vagas você **NÃO** quer receber (stacks que não trabalha, empresas específicas, etc), edite a variável `termosExclusao` no arquivo `src/scraper.ts`.

Por padrão o bot já bloqueia:
- **Linguagens Específicas:** Java, PHP, Ruby, Go, C++, Rust, Delphi.
- **Low Code / E-commerce:** Power Platform, WordPress, Magento, Shopify, VTEX.
- **Mobile Nativo:** iOS, Android, Flutter, Swift, Kotlin.
- **Senioridades:** Sênior, Especialista, Tech Lead, Arquiteto, Estágio, Trainee.

----
Feito com ☕ e IA para facilitar a vida do Desenvolvedor!