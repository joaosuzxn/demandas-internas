<?php

namespace App\Services;

use App\Enums\DemandCategory;
use App\Enums\DemandMovementType;
use App\Enums\DemandStatus;
use App\Models\Demand;
use App\Models\DemandMovement;
use App\Support\BusinessDay;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// Números do dashboard (item 0030). Contam as demandas criadas no período (situação atual), sem as excluídas.
class DashboardService
{
    /**
     * Até quantos dias o gráfico vai por dia; acima disso, por mês. 93 = o maior "3 meses" da tela (92 dias de
     * três meses mais hoje): o mesmo botão desenha sempre o gráfico por dia, em qualquer época do ano.
     */
    private const DAILY_LIMIT_DAYS = 93;

    /**
     * @param  array<string, mixed>  $filters  já validados (DashboardFiltersRequest)
     * @return array{total: int, pending: int, in_progress: int, finished: int}
     */
    public function summary(array $filters): array
    {
        $counts = $this->countBy('status', $filters);

        $byStatus = [];
        foreach (DemandStatus::cases() as $status) {
            $byStatus[$status->value] = $counts[$status->value] ?? 0;
        }

        // O total é a soma: nunca diverge das três situações.
        return ['total' => array_sum($byStatus)] + $byStatus;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array{category: string, total: int}>
     */
    public function categories(array $filters): array
    {
        $counts = $this->countBy('category', $filters);

        return array_map(
            fn (DemandCategory $category) => ['category' => $category->value, 'total' => $counts[$category->value] ?? 0],
            DemandCategory::cases(),
        );
    }

    /**
     * Criadas (pela data de criação) e concluídas (pela data de cada conclusão) em cada dia ou mês do período.
     *
     * @param  array<string, mixed>  $filters
     * @return array{granularity: string, points: list<array{date: string, created: int, finished: int}>}
     */
    public function trend(array $filters): array
    {
        $timezone = config('app.business_timezone');
        $category = $filters['category'] ?? null;

        $end = isset($filters['created_to']) ? BusinessDay::start($filters['created_to']) : BusinessDay::today();
        $start = isset($filters['created_from']) ? BusinessDay::start($filters['created_from']) : $this->oldestDay($category);

        if ($start === null || $start->greaterThan($end)) {
            return ['granularity' => 'day', 'points' => []];
        }

        $days = (int) round($start->diffInDays($end)) + 1;
        $granularity = $days <= self::DAILY_LIMIT_DAYS ? 'day' : 'month';
        $from = $start->copy()->utc();
        $until = $end->copy()->addDay()->utc();

        $created = $this->bucketCounts(
            Demand::query()
                ->when($category, fn (Builder $query) => $query->where('category', $category))
                ->where('created_at', '>=', $from)
                ->where('created_at', '<', $until),
            'demands.created_at', $granularity, $timezone,
        );

        // whereHas leva o SoftDeletes da demanda: conclusão de demanda excluída não conta.
        $finished = $this->bucketCounts(
            DemandMovement::query()
                ->where('type', DemandMovementType::Finished)
                ->whereHas('demand', fn (Builder $query) => $query->when($category, fn (Builder $inner) => $inner->where('category', $category)))
                ->where('demand_movements.created_at', '>=', $from)
                ->where('demand_movements.created_at', '<', $until),
            'demand_movements.created_at', $granularity, $timezone,
        );

        $points = [];
        $cursor = $granularity === 'day' ? $start->copy() : $start->copy()->startOfMonth();
        while ($cursor->lessThanOrEqualTo($end)) {
            $date = $cursor->format('Y-m-d');
            $points[] = ['date' => $date, 'created' => $created[$date] ?? 0, 'finished' => $finished[$date] ?? 0];
            $granularity === 'day' ? $cursor->addDay() : $cursor->addMonth();
        }

        return ['granularity' => $granularity, 'points' => $points];
    }

    // O dia (no fuso do negócio) da demanda mais antiga da categoria; null sem nenhuma demanda.
    private function oldestDay(?string $category): ?Carbon
    {
        $oldest = Demand::query()
            ->when($category, fn (Builder $query) => $query->where('category', $category))
            ->min('created_at');

        return $oldest === null
            ? null
            : Carbon::parse($oldest, 'UTC')->setTimezone(config('app.business_timezone'))->startOfDay();
    }

    /**
     * Contagem por dia ou mês no fuso do negócio, com a chave `Y-m-d` (no mês, o dia 1). O banco grava em UTC
     * sem fuso: `AT TIME ZONE 'UTC'` diz que é UTC e o segundo `AT TIME ZONE` passa para o horário local.
     * A granularidade só vale 'day' ou 'month' (definida aqui), por isso entra no SQL; o fuso vai por binding.
     *
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query
     * @return array<string, int>
     */
    private function bucketCounts(Builder $query, string $column, string $granularity, string $timezone): array
    {
        $bucket = "to_char(date_trunc('{$granularity}', {$column} AT TIME ZONE 'UTC' AT TIME ZONE ?), 'YYYY-MM-DD')";

        return $query->toBase()
            ->selectRaw("{$bucket} as bucket, count(*) as total", [$timezone])
            ->groupBy('bucket')
            ->pluck('total', 'bucket')
            ->map(fn ($total) => (int) $total)
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, int>
     */
    private function countBy(string $column, array $filters): array
    {
        // toBase(): sem o cast do model, a coluna volta como texto (o enum viraria objeto e não serviria de chave).
        return $this->scoped($filters)
            ->toBase()
            ->select($column, DB::raw('count(*) as total'))
            ->groupBy($column)
            ->pluck('total', $column)
            ->map(fn ($total) => (int) $total)
            ->all();
    }

    /**
     * Demandas do recorte: categoria e período de criação. As excluídas ficam fora pelo SoftDeletes.
     *
     * @param  array<string, mixed>  $filters
     * @return Builder<Demand>
     */
    private function scoped(array $filters): Builder
    {
        return Demand::query()
            ->when($filters['category'] ?? null, fn (Builder $query, string $category) => $query->where('category', $category))
            ->when($filters['created_from'] ?? null, fn (Builder $query, string $day) => $query->where('created_at', '>=', BusinessDay::start($day)->utc()))
            ->when($filters['created_to'] ?? null, fn (Builder $query, string $day) => $query->where('created_at', '<', BusinessDay::start($day)->addDay()->utc()));
    }
}
