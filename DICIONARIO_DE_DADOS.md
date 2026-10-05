# Dicionário de Dados

Banco **PostgreSQL 17**. A estrutura é criada pelas migrations do Laravel (`api/database/migrations/`), executadas
automaticamente na subida dos containers (veja o [README](README.md#banco-de-dados-migrations-e-seeds)).

Convenções:

- Tipos conforme gerados pelo Laravel no PostgreSQL: `string(n)` vira `varchar(n)` (padrão 255) e `timestamps()`
  vira `timestamp(0) without time zone`.
- Datas são gravadas em **UTC**; a conversão para o fuso local é feita na exibição e nos filtros por período.
- Situação, categoria, perfil e tipo de movimentação são colunas de texto validadas por **enums do PHP**
  (`api/app/Enums/`), e não enums do PostgreSQL: um valor novo não exige alterar o tipo no banco.
- Usuários **não são excluídos**, só desativados (`is_active = false`). Solicitações usam **exclusão lógica**
  (`deleted_at`).

## Diagrama de relacionamento

```
users 1 ──── N demands             (users.id = demands.requester_id)
users 1 ──── N demand_movements    (users.id = demand_movements.actor_id)
demands 1 ── N demand_movements    (demands.id = demand_movements.demand_id)
```

---

## Tabelas de negócio

### `users` — usuários do sistema

| Coluna | Tipo | Nulo | Padrão | Chave / Índice | Descrição |
|---|---|---|---|---|---|
| `id` | bigint (auto incremento) | Não | sequência | PK | Identificador do usuário. |
| `name` | varchar(255) | Não | — | — | Nome completo. |
| `username` | varchar(30) | Não | — | UNIQUE | Usuário de login. Minúsculas, 3 a 30 caracteres entre `a-z`, `0-9`, `.`, `_` e `-` (sem `@`). |
| `cpf` | char(11) | Não | — | UNIQUE | CPF validado (dígitos verificadores), gravado só com os 11 dígitos, sem máscara. |
| `email` | varchar(255) | Não | — | UNIQUE | E-mail, em minúsculas. Também pode ser usado no login. |
| `password` | varchar(255) | Não | — | — | Hash bcrypt da senha. Nunca é devolvido pela API. |
| `role` | varchar(20) | Não | `'employee'` | — | Perfil: `admin` (administrador) ou `employee` (colaborador). |
| `is_active` | boolean | Não | `true` | — | Se `false`, o usuário não consegue entrar e perde a sessão aberta. |
| `must_change_password` | boolean | Não | `true` | — | Se `true`, o sistema só libera a troca de senha (primeiro acesso ou senha redefinida). |
| `remember_token` | varchar(100) | Sim | `NULL` | — | Token do cookie "Lembrar-me". |
| `created_at` | timestamp(0) | Sim | `NULL` | — | Data de cadastro. |
| `updated_at` | timestamp(0) | Sim | `NULL` | — | Data da última alteração. |

### `demands` — solicitações

| Coluna | Tipo | Nulo | Padrão | Chave / Índice | Descrição |
|---|---|---|---|---|---|
| `id` | bigint (auto incremento) | Não | sequência | PK | Código da solicitação (exibido na listagem). |
| `title` | varchar(150) | Não | — | — | Título. Obrigatório, até 150 caracteres. Usado na busca por texto livre. |
| `description` | text | Não | — | — | Descrição. Obrigatória, até 5.000 caracteres (validado na API). |
| `category` | varchar(20) | Não | — | — | Categoria (ver domínio abaixo). |
| `status` | varchar(20) | Não | `'pending'` | INDEX | Situação (ver domínio abaixo). Só muda pelas ações iniciar, finalizar e reabrir. |
| `requester_id` | bigint | Não | — | FK → `users.id` (ON DELETE RESTRICT), INDEX | Usuário solicitante, preenchido automaticamente com quem criou. |
| `created_at` | timestamp(0) | Sim | `NULL` | — | Data de abertura, preenchida automaticamente. Usada no filtro por período. |
| `updated_at` | timestamp(0) | Sim | `NULL` | — | Data da última alteração. |
| `deleted_at` | timestamp(0) | Sim | `NULL` | — | Exclusão lógica: preenchida quando a solicitação é excluída; a linha some das consultas. |

### `demand_movements` — histórico das solicitações

Tabela só de inserção: cada ato sobre uma solicitação gera uma linha, gravada na mesma transação da alteração.

| Coluna | Tipo | Nulo | Padrão | Chave / Índice | Descrição |
|---|---|---|---|---|---|
| `id` | bigint (auto incremento) | Não | sequência | PK | Identificador da movimentação. |
| `demand_id` | bigint | Não | — | FK → `demands.id` (ON DELETE CASCADE) | Solicitação movimentada. |
| `type` | varchar(20) | Não | — | — | Tipo do ato (ver domínio abaixo). |
| `actor_id` | bigint | Não | — | FK → `users.id` (ON DELETE RESTRICT) | Usuário que realizou o ato. |
| `created_at` | timestamp(0) | Não | — | — | Momento do ato. Não há `updated_at`: a linha nunca é alterada. |

Índice composto: (`demand_id`, `id`), para listar o histórico de uma solicitação em ordem.

---

## Domínios (valores permitidos)

### `demands.status`

| Valor | Na tela | No edital |
|---|---|---|
| `pending` | Pendente | Aberto |
| `in_progress` | Em andamento | Em Atendimento |
| `finished` | Finalizada | Concluído |

Transições: `pending → in_progress` (iniciar), `in_progress → finished` (finalizar), `finished → pending` (reabrir).
Editar e excluir só são permitidos com `status = pending`.

### `demands.category`

| Valor | Na tela |
|---|---|
| `it` | TI |
| `hr` | RH |
| `purchasing` | Compras |
| `finance` | Financeiro |
| `infrastructure` | Infraestrutura |

### `demand_movements.type`

| Valor | Significado |
|---|---|
| `created` | Solicitação criada |
| `edited` | Solicitação editada (só grava se algum campo mudou) |
| `started` | Atendimento iniciado |
| `finished` | Solicitação finalizada |
| `reopened` | Solicitação reaberta |

### `users.role`

| Valor | Significado |
|---|---|
| `admin` | Administrador: cadastra e gerencia usuários; edita e exclui qualquer solicitação pendente. |
| `employee` | Colaborador: registra e atende solicitações; edita e exclui só as que criou. |

---

## Tabelas de infraestrutura do Laravel

Criadas pelas migrations padrão do framework. Não guardam dados de negócio.

| Tabela | Finalidade | Colunas principais |
|---|---|---|
| `sessions` | Sessões de login (driver de sessão `database`) | `id` (PK, varchar), `user_id` (bigint, nulo, índice), `ip_address` (varchar(45)), `user_agent` (text), `payload` (longtext), `last_activity` (integer, índice) |
| `cache` | Cache da aplicação, inclusive os contadores do limite de tentativas de login | `key` (PK), `value` (mediumtext), `expiration` (bigint, índice) |
| `cache_locks` | Travas do cache | `key` (PK), `owner`, `expiration` (bigint, índice) |
| `jobs` | Fila de tarefas (reservada; não usada pelo sistema hoje) | `id` (PK), `queue` (índice), `payload`, `attempts`, `reserved_at`, `available_at`, `created_at` |
| `job_batches` | Lotes de tarefas da fila | `id` (PK), `name`, `total_jobs`, `pending_jobs`, `failed_jobs`, `failed_job_ids`, `options`, `cancelled_at`, `created_at`, `finished_at` |
| `failed_jobs` | Tarefas da fila que falharam | `id` (PK), `uuid` (UNIQUE), `connection`, `queue`, `payload`, `exception`, `failed_at` |
| `migrations` | Controle de quais migrations já rodaram (criada pelo Laravel) | `id`, `migration`, `batch` |
