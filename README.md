# Portal de Solicitações Internas

Sistema web para colaboradores registrarem solicitações a outros setores (TI, RH, Compras, Financeiro e
Infraestrutura) e acompanharem cada uma até a conclusão.

- **Backend:** API REST em Laravel (PHP), com autenticação por sessão (Sanctum).
- **Frontend:** SPA em Vue 3 + TypeScript, que consome a API.
- **Banco de dados:** PostgreSQL, com estrutura criada por migrations.
- **Infraestrutura:** tudo roda em Docker Compose, atrás de um nginx que serve a SPA e a API na mesma origem.

## Funcionalidades

| Módulo | O que faz |
|---|---|
| Autenticação | Login por usuário (ou e-mail) e senha, opção "Lembrar-me", logout. Toda rota exige sessão. No primeiro acesso, o usuário troca a senha inicial. |
| Solicitações | Registrar com título, descrição e categoria. A data de criação, o solicitante e o status **Pendente** são preenchidos sozinhos. Editar e excluir só enquanto pendente, e só quem criou ou o administrador. |
| Gerenciamento | Quadro com uma coluna por status: **Pendente**, **Em andamento** e **Finalizada**. Cada cartão mostra o código, o título, a categoria, o solicitante e a data de abertura. A tela da solicitação mostra os detalhes e o histórico de movimentações. Qualquer usuário altera o status: iniciar, finalizar ou reabrir. |
| Consulta e filtros | Busca por texto no título, filtro por categoria e por período de abertura; o status é a coluna do quadro. |
| Dashboard | Total de solicitações e quantidade por status, divisão por categoria e evolução no tempo, com filtros por período e categoria. |
| Usuários (admin) | Cadastro, edição, ativação e desativação de usuários e redefinição de senha. |

> Na tela, os status do PDF aparecem como **Pendente** (Aberto), **Em andamento** (Em Atendimento) e
> **Finalizada** (Concluído).

## Pré-requisitos

A aplicação roda inteira em containers: **não é preciso** instalar PHP, Composer, Node ou PostgreSQL na máquina.

| Item | Versão |
|---|---|
| Docker Engine com Docker Compose v2 (ou Docker Desktop) | Compose 2.20 ou superior |
| Git | qualquer versão recente |
| `openssl` | para gerar a chave da aplicação (já vem no macOS e no Linux; no Windows, use o Git Bash) |
| Porta **8080** livre | entrada da aplicação |
| Porta **5433** livre | acesso ao banco por um cliente SQL (opcional) |

O que roda dentro dos containers:

| Camada | Tecnologia |
|---|---|
| Linguagens | PHP 8.4, TypeScript |
| Backend | Laravel 13, Laravel Sanctum 4 |
| Frontend | Vue 3, Vite 8, Vue Router 5, Pinia 4, Axios, Tailwind CSS 4 (Node 24 no container) |
| Banco de dados | PostgreSQL 17 |
| Servidor web | nginx (stable-alpine) |
| Testes | PHPUnit (API), Vitest + Vue Test Utils (SPA) |

As dependências do PHP (`api/composer.json`) e do Node (`web/package.json`) são instaladas automaticamente pelos
containers.

## Instalação

```bash
# 1. Clonar o repositório
git clone <url-do-repositorio> demandas-internas
cd demandas-internas

# 2. Criar o arquivo de ambiente a partir do modelo
cp .env.example .env

# 3. Gerar a chave da aplicação e colar o resultado em APP_KEY, no .env
echo "base64:$(openssl rand -base64 32)"

# 4. Subir tudo (backend, frontend, banco e nginx)
docker compose up -d
```

A primeira subida leva alguns minutos: o Docker baixa as imagens e monta a do PHP. Depois disso, cada parte se prepara
sozinha:

- **Banco de dados:** o container `db` cria o banco e o usuário definidos no `.env`. Em seguida, a API roda as
  **migrations**, que criam todas as tabelas, e os **seeders**, que criam o administrador e as solicitações de exemplo.
  Não há script SQL para rodar à mão.
- **Backend:** o container `api` roda `composer install`, `php artisan migrate` e `php artisan db:seed`, e então sobe
  o php-fpm.
- **Frontend:** o container `web` roda `npm install` e sobe o servidor do Vite.

Enquanto a API se prepara (cerca de 30 segundos depois que os containers sobem), o navegador pode mostrar
**502 Bad Gateway**. É só aguardar e recarregar. Para acompanhar:

```bash
docker compose logs -f api
```

### Banco de dados: migrations e seeds

A estrutura do banco é criada pelas **migrations** do Laravel (`api/database/migrations/`), e os dados iniciais vêm dos
**seeders** (`api/database/seeders/`). A subida dos containers já roda os dois, mas eles também podem ser executados à
mão. No desenvolvimento:

```bash
# Ver quais migrations já rodaram
docker compose exec api php artisan migrate:status

# Criar as tabelas que faltam (não apaga nada)
docker compose exec api php artisan migrate

# Popular o banco: administrador e solicitações de exemplo
docker compose exec api php artisan db:seed

# Recriar o banco do zero: apaga todas as tabelas, roda as migrations e os seeders
docker compose exec api php artisan migrate:fresh --seed
```

| Migration | Cria |
|---|---|
| `create_users_table` | `users` (usuários, com a coluna do "Lembrar-me") e `sessions` (sessões de login) |
| `create_cache_table` / `create_jobs_table` | tabelas internas do Laravel de cache e de fila |
| `create_demands_table` | `demands` (solicitações) |
| `create_demand_movements_table` | `demand_movements` (histórico de cada solicitação) |

| Seeder | O que faz |
|---|---|
| `AdminSeeder` | Cria o administrador (`admin` / `password`). Não faz nada se já existir um administrador. |
| `DemandSeeder` | Cria 37 solicitações de exemplo, com histórico. Só roda no desenvolvimento e só se o banco não tiver nenhuma solicitação. |

Os dois seeders podem rodar quantas vezes for preciso sem duplicar dados. Para rodar só um deles:
`docker compose exec api php artisan db:seed --class=AdminSeeder`.

No ambiente de produção, os comandos levam `-f compose.prod.yml` e `--force`, que confirma a execução em produção:

```bash
docker compose -f compose.prod.yml exec api php artisan migrate --force
docker compose -f compose.prod.yml exec api php artisan db:seed --force
```

## Configuração

### Variáveis de ambiente

O projeto tem **um único `.env`, na raiz**. Ele abastece a API, o frontend e o próprio Docker Compose. Não existe
`api/.env` nem `web/.env`. Se alguma variável obrigatória estiver vazia, o `docker compose` para e diz qual falta.

| Variável | Para que serve | Valor do modelo |
|---|---|---|
| `COMPOSE_FILE` | Arquivo usado pelo `docker compose` sem `-f` (o de desenvolvimento) | `compose.dev.yml` |
| `APP_NAME` | Nome da aplicação | `"Demandas Internas"` |
| `APP_KEY` | Chave de criptografia do Laravel (**obrigatória**; gere no passo 3) | vazio |
| `APP_URL` | Endereço da aplicação | `http://localhost:8080` |
| `APP_LOCALE` / `APP_FALLBACK_LOCALE` | Idioma das mensagens da API | `pt_BR` / `en` |
| `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | Nome do banco, usuário e senha do PostgreSQL | `demandas` / `demandas` / `demandas` |
| `SANCTUM_STATEFUL_DOMAINS` | Origem autorizada a usar a sessão por cookie | `localhost:8080` |
| `VITE_APP_TITLE` | Título exibido pelo frontend (público: vai para o navegador) | `"Solicitações internas"` |
| `DEFAULT_PASSWORD` | Senha inicial de todo usuário cadastrado ou com senha redefinida | `123@Senha` |

O endereço do banco (`DB_HOST`), o ambiente (`APP_ENV`) e o modo de depuração (`APP_DEBUG`) ficam fixos em cada
arquivo compose, porque dependem do ambiente e não da máquina.

### Credenciais de demonstração

| Perfil | Usuário | Senha |
|---|---|---|
| Administrador | `admin` | `password` |

No primeiro acesso, o sistema pede a troca da senha e só libera as telas depois dela.

## Execução

### Desenvolvimento

| O quê | Comando |
|---|---|
| Subir backend, frontend e banco | `docker compose up -d` |
| Ver os logs | `docker compose logs -f` (ou `logs -f api`, `logs -f web`) |
| Parar | `docker compose down` |
| Parar e apagar o banco | `docker compose down -v` |
| Recriar o banco do zero, com os dados de exemplo | `docker compose exec api php artisan migrate:fresh --seed` |

O backend e o frontend sobem juntos com o `docker compose up -d`. Para reiniciar só um deles:

```bash
docker compose restart api   # backend (Laravel)
docker compose restart web   # frontend (Vite)
```

Em desenvolvimento, alterações no código aparecem sem rebuild. O Vite recarrega a tela sozinho, e a API lê o código
direto da pasta `api/`.

### Testes e qualidade

```bash
docker compose exec api php artisan test                # testes da API (banco de testes separado)
docker compose exec web npm run test:unit -- --run      # testes do frontend
docker compose exec api ./vendor/bin/pint --test        # padrão de código do PHP
docker compose exec web npm run lint                    # lint do frontend
docker compose exec web npm run type-check              # checagem de tipos do TypeScript
```

Os testes da API usam um banco próprio (`db_test`, apagado a cada subida). Rodar os testes nunca apaga os dados do
banco de desenvolvimento.

### Produção (local)

`compose.prod.yml` monta imagens fechadas: o código fica dentro das imagens, o frontend é compilado e servido pelo
nginx, e os containers são somente leitura. Ele usa a mesma porta 8080, então derrube o dev antes:

```bash
docker compose down
docker compose -f compose.prod.yml up -d --build
docker compose -f compose.prod.yml down               # para parar
```

O ambiente de produção não cria solicitações de exemplo, só o administrador.

## Acesso

| O quê | Endereço |
|---|---|
| Aplicação (frontend + API) | http://localhost:8080 |
| API | http://localhost:8080/api (ex.: `GET /api/health`) |
| Banco de dados (cliente SQL, só no dev) | `localhost:5433`, banco, usuário e senha do `.env` (`demandas` / `demandas` / `demandas` no modelo) |

**Usuário de teste:** entre com `admin` / `password` e troque a senha quando o sistema pedir.

**Outros usuários:** o administrador cadastra pela tela **Administração**, no menu lateral. Todo usuário novo entra com a senha de
`DEFAULT_PASSWORD` (`123@Senha` no modelo) e também troca a senha no primeiro acesso. Assim dá para testar com um
colaborador comum: ele registra e acompanha solicitações, mas só edita e exclui as que ele mesmo criou.

**Dados de exemplo:** no ambiente de desenvolvimento, o banco já sobe com 37 solicitações distribuídas pelos três
status, para o quadro e o dashboard não aparecerem vazios.

## Estrutura do repositório

```
demandas-internas/
├── api/                 # Backend Laravel
│   ├── app/
│   │   ├── Enums/       # status, categorias, tipos de movimentação, perfis
│   │   ├── Http/        # Controllers (finos), Form Requests (validação), Resources (JSON), Middleware
│   │   ├── Models/      # User, Demand, DemandMovement
│   │   ├── Policies/    # autorização (quem pode o quê)
│   │   └── Services/    # regras de negócio
│   ├── database/        # migrations (estrutura do banco), seeders, factories
│   ├── routes/api.php   # rotas da API
│   └── tests/           # testes PHPUnit
├── web/                 # Frontend Vue
│   └── src/
│       ├── views/       # telas
│       ├── components/  # componentes reutilizáveis
│       ├── services/    # chamadas à API (um arquivo por domínio, via http.ts)
│       ├── stores/      # estado (Pinia)
│       ├── composables/ # lógica de tela reutilizável
│       └── router/      # rotas e guarda de autenticação
├── docker/              # Dockerfiles, entrypoints e configuração do nginx
├── compose.dev.yml      # ambiente de desenvolvimento
├── compose.prod.yml     # ambiente de produção (local)
└── .env.example         # modelo do único .env do projeto
```

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `no configuration file provided: not found` | Falta o `.env` (é ele que aponta o `compose.dev.yml`). Rode `cp .env.example .env`. |
| `required variable APP_KEY is missing a value` | A `APP_KEY` está vazia. Gere com o comando do passo 3 da instalação. |
| `502 Bad Gateway` logo depois de subir | A API ainda está instalando dependências ou migrando. Aguarde e acompanhe com `docker compose logs -f api`. |
| `port is already allocated` na 8080 ou na 5433 | Outro programa está usando a porta. Libere a porta ou troque o número em `compose.dev.yml`. |
