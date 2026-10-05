<?php

namespace App\Services;

use App\Enums\DemandMovementType;
use App\Enums\DemandStatus;
use App\Models\Demand;
use App\Models\DemandMovement;
use App\Models\User;
use App\Support\BusinessDay;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DemandService
{
    private const PER_PAGE = 10;

    /**
     * @param  array<string, mixed>  $filters  filtros já validados: a listagem (ListDemandsRequest) traz a situação; a busca (SearchDemandsRequest), título, categoria e período
     * @return LengthAwarePaginator<int, Demand>
     */
    public function paginate(array $filters): LengthAwarePaginator
    {
        $term = trim((string) ($filters['search'] ?? ''));
        // %, _ e \ do termo valem como texto, não como curinga do LIKE.
        $escaped = addcslashes($term, '%_\\');

        return Demand::query()
            ->with('requester')
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['category'] ?? null, fn (Builder $query, string $category) => $query->where('category', $category))
            ->when($term !== '', fn (Builder $query) => $query->where('title', 'ilike', "%{$escaped}%"))
            ->when($filters['created_from'] ?? null, fn (Builder $query, string $day) => $query->where('created_at', '>=', BusinessDay::start($day)->utc()))
            ->when($filters['created_to'] ?? null, fn (Builder $query, string $day) => $query->where('created_at', '<', BusinessDay::start($day)->addDay()->utc()))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE);
    }

    /**
     * @param  array<string, mixed>  $data  dados já validados (DemandRules)
     */
    public function create(array $data, User $requester): Demand
    {
        return DB::transaction(function () use ($data, $requester) {
            $demand = new Demand($data);
            $demand->status = DemandStatus::Pending;
            $demand->requester()->associate($requester);
            $demand->save();

            $this->record($demand, DemandMovementType::Created, $requester);

            return $demand;
        });
    }

    /**
     * @param  array<string, mixed>  $data  dados já validados (DemandRules)
     */
    public function update(Demand $demand, array $data, User $actor): Demand
    {
        return DB::transaction(function () use ($demand, $data, $actor) {
            $locked = $this->lock($demand);

            if ($locked->status !== DemandStatus::Pending) {
                throw ValidationException::withMessages(['status' => __('demands.only_pending_can_be_edited')]);
            }

            $locked->fill($data);

            // Salvar sem mudar nada não é edição: nem grava, nem vira movimentação.
            if (! $locked->isDirty()) {
                return $locked;
            }

            $locked->save();
            $this->record($locked, DemandMovementType::Edited, $actor);

            return $locked;
        });
    }

    // Soft delete: a linha fica no banco com deleted_at e some das consultas. Como editar, só a pendente (item 0041).
    public function delete(Demand $demand): void
    {
        DB::transaction(function () use ($demand) {
            $locked = $this->lock($demand);

            if ($locked->status !== DemandStatus::Pending) {
                throw ValidationException::withMessages(['status' => __('demands.only_pending_can_be_deleted')]);
            }

            $locked->delete();
        });
    }

    public function start(Demand $demand, User $actor): Demand
    {
        return $this->transition($demand, $actor, DemandStatus::Pending, DemandStatus::InProgress, DemandMovementType::Started, 'demands.start_requires_pending');
    }

    public function close(Demand $demand, User $actor): Demand
    {
        return $this->transition($demand, $actor, DemandStatus::InProgress, DemandStatus::Finished, DemandMovementType::Finished, 'demands.close_requires_in_progress');
    }

    public function reopen(Demand $demand, User $actor): Demand
    {
        return $this->transition($demand, $actor, DemandStatus::Finished, DemandStatus::Pending, DemandMovementType::Reopened, 'demands.reopen_requires_finished');
    }

    // Cada ação só sai de uma situação e só vai para outra; fora da origem, 422 no campo status.
    // A mudança e a movimentação vão juntas: se uma falha, a outra é desfeita.
    private function transition(Demand $demand, User $actor, DemandStatus $from, DemandStatus $to, DemandMovementType $movement, string $message): Demand
    {
        return DB::transaction(function () use ($demand, $actor, $from, $to, $movement, $message) {
            $locked = $this->lock($demand);

            if ($locked->status !== $from) {
                throw ValidationException::withMessages(['status' => __($message)]);
            }

            $locked->status = $to;
            $locked->save();
            $this->record($locked, $movement, $actor);

            return $locked;
        });
    }

    // Relê a solicitação travando a linha até o fim da transação: a situação conferida é a do banco agora, e não a de
    // quando a requisição carregou a solicitação. Duas ações ao mesmo tempo (duas abas, duas pessoas) passam uma de cada
    // vez, e a segunda recebe o 422 — sem movimentação duplicada ou fora de ordem no histórico.
    private function lock(Demand $demand): Demand
    {
        return Demand::query()->lockForUpdate()->findOrFail($demand->getKey());
    }

    // Histórico só de inserção: a única escrita em demand_movements.
    private function record(Demand $demand, DemandMovementType $type, User $actor): void
    {
        $movement = new DemandMovement;
        $movement->type = $type;
        $movement->demand()->associate($demand);
        $movement->actor()->associate($actor);
        $movement->save();
    }
}
