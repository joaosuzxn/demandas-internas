<?php

namespace Database\Seeders;

use App\Enums\DemandMovementType;
use App\Enums\DemandStatus;
use App\Models\Demand;
use App\Models\DemandMovement;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demandas de exemplo para ver o quadro no navegador. Só no ambiente local (o Faker é dev-only,
 * e prod não pode ter dados de teste). Idempotente: não roda se já há demandas.
 */
class DemandSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local') || Demand::exists()) {
            return;
        }

        // Os solicitantes são os usuários que já existem (o AdminSeeder garante ao menos um).
        $requesterIds = User::query()->pluck('id')->all();

        // 26 pendentes, 5 em andamento e 6 finalizadas: com 10 por página, a coluna Pendente precisa de
        // três páginas, e a rolagem infinita do quadro aparece no dev.
        Demand::factory()->count(26)->state(fn () => [
            'requester_id' => fake()->randomElement($requesterIds),
        ])->create();

        Demand::factory()->inProgress()->count(5)->state(fn () => [
            'requester_id' => fake()->randomElement($requesterIds),
        ])->create();

        Demand::factory()->finished()->count(6)->state(fn () => [
            'requester_id' => fake()->randomElement($requesterIds),
        ])->create();

        // Histórico coerente com a situação: pendente → criada; em andamento → + iniciada; finalizada → + finalizada.
        Demand::query()->each(function (Demand $demand) {
            $steps = match ($demand->status) {
                DemandStatus::Pending => [DemandMovementType::Created],
                DemandStatus::InProgress => [DemandMovementType::Created, DemandMovementType::Started],
                DemandStatus::Finished => [DemandMovementType::Created, DemandMovementType::Started, DemandMovementType::Finished],
            };

            foreach ($steps as $type) {
                DemandMovement::factory()->for($demand)->type($type)->create(['actor_id' => $demand->requester_id]);
            }
        });
    }
}
