<?php

namespace Database\Seeders;

use App\Models\Demand;
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

        // 26 abertas e 6 fechadas: 26 passa do limite de 20 por coluna e mostra o aviso "Mostrando 20 de 26".
        Demand::factory()->count(26)->state(fn () => [
            'requester_id' => fake()->randomElement($requesterIds),
        ])->create();

        Demand::factory()->closed()->count(6)->state(fn () => [
            'requester_id' => fake()->randomElement($requesterIds),
        ])->create();
    }
}
