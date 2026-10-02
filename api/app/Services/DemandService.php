<?php

namespace App\Services;

use App\Enums\DemandStatus;
use App\Models\Demand;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class DemandService
{
    private const PER_PAGE = 20;

    /**
     * @param  array<string, mixed>  $filters  filtros já validados (ListDemandsRequest)
     * @return LengthAwarePaginator<int, Demand>
     */
    public function paginate(array $filters, User $actor): LengthAwarePaginator
    {
        $term = trim((string) ($filters['search'] ?? ''));
        // %, _ e \ do termo valem como texto, não como curinga do LIKE.
        $escaped = addcslashes($term, '%_\\');

        return Demand::query()
            ->with('requester')
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['category'] ?? null, fn (Builder $query, string $category) => $query->where('category', $category))
            ->when($term !== '', fn (Builder $query) => $query->where('title', 'ilike', "%{$escaped}%"))
            ->when($filters['mine'] ?? false, fn (Builder $query) => $query->where('requester_id', $actor->id))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE);
    }

    /**
     * @param  array<string, mixed>  $data  dados já validados (DemandRules)
     */
    public function create(array $data, User $requester): Demand
    {
        $demand = new Demand($data);
        $demand->status = DemandStatus::Open;
        $demand->requester()->associate($requester);
        $demand->save();

        return $demand;
    }

    /**
     * @param  array<string, mixed>  $data  dados já validados (DemandRules)
     */
    public function update(Demand $demand, array $data): Demand
    {
        if ($demand->status === DemandStatus::Closed) {
            throw ValidationException::withMessages(['status' => __('demands.closed_cannot_be_edited')]);
        }

        $demand->fill($data)->save();

        return $demand;
    }

    // Soft delete: a linha fica no banco com deleted_at e some das consultas.
    public function delete(Demand $demand): void
    {
        $demand->delete();
    }

    public function close(Demand $demand): Demand
    {
        if ($demand->status === DemandStatus::Closed) {
            throw ValidationException::withMessages(['status' => __('demands.already_closed')]);
        }

        $demand->status = DemandStatus::Closed;
        $demand->save();

        return $demand;
    }

    public function reopen(Demand $demand): Demand
    {
        if ($demand->status === DemandStatus::Open) {
            throw ValidationException::withMessages(['status' => __('demands.already_open')]);
        }

        $demand->status = DemandStatus::Open;
        $demand->save();

        return $demand;
    }
}
