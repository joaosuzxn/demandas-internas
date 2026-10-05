<?php

namespace Tests\Feature\Demands;

use App\Models\Demand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Iniciar (pendente → em andamento), finalizar (em andamento → finalizada), reabrir (finalizada → pendente).
class DemandStatusTest extends TestCase
{
    use RefreshDatabase;

    private const MESSAGES = [
        'start' => 'Só solicitação pendente pode ser iniciada.',
        'close' => 'Só solicitação em andamento pode ser finalizada.',
        'reopen' => 'Só solicitação finalizada pode ser reaberta.',
    ];

    // Ação → [situação de origem, situação de destino].
    private const TRANSITIONS = [
        'start' => ['pending', 'in_progress'],
        'close' => ['in_progress', 'finished'],
        'reopen' => ['finished', 'pending'],
    ];

    private User $requester;

    private User $admin;

    private User $stranger;

    protected function setUp(): void
    {
        parent::setUp();
        $this->requester = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
        $this->stranger = User::factory()->create();
    }

    private function demandIn(string $status): Demand
    {
        $factory = Demand::factory();
        $factory = match ($status) {
            'in_progress' => $factory->inProgress(),
            'finished' => $factory->finished(),
            default => $factory,
        };

        return $factory->create(['requester_id' => $this->requester->id]);
    }

    public function test_guest_gets_unauthorized(): void
    {
        $demand = $this->demandIn('pending');

        foreach (array_keys(self::TRANSITIONS) as $action) {
            $this->fromSpa()->postJson("/api/demands/{$demand->id}/{$action}")->assertUnauthorized();
        }
    }

    public function test_requester_and_admin_move_the_demand_along(): void
    {
        foreach (self::TRANSITIONS as $action => [$from, $to]) {
            foreach ([$this->requester, $this->admin] as $actor) {
                $demand = $this->demandIn($from);

                $this->actingAsSpa($actor)->postJson("/api/demands/{$demand->id}/{$action}")
                    ->assertOk()
                    ->assertJsonPath('data.id', $demand->id)
                    ->assertJsonPath('data.status', $to)
                    ->assertJsonPath('data.requester.id', $this->requester->id);

                $this->assertDatabaseHas('demands', ['id' => $demand->id, 'status' => $to]);
            }
        }
    }

    // Toda ação fora da situação de origem é recusada, inclusive reabrir uma em andamento.
    public function test_action_outside_its_source_status_is_rejected(): void
    {
        foreach (self::TRANSITIONS as $action => [$from]) {
            foreach (['pending', 'in_progress', 'finished'] as $status) {
                if ($status === $from) {
                    continue;
                }

                $demand = $this->demandIn($status);

                $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/{$action}")
                    ->assertUnprocessable()
                    ->assertJsonValidationErrors(['status' => self::MESSAGES[$action]]);

                $this->assertDatabaseHas('demands', ['id' => $demand->id, 'status' => $status]);
            }
        }
    }

    // Atender é de todos (ADR 0003): quem não pediu também inicia, finaliza e reabre, e o histórico guarda quem foi.
    public function test_any_user_moves_another_persons_demand(): void
    {
        foreach (self::TRANSITIONS as $action => [$from, $to]) {
            $demand = $this->demandIn($from);

            $this->actingAsSpa($this->stranger)->postJson("/api/demands/{$demand->id}/{$action}")
                ->assertOk()
                ->assertJsonPath('data.status', $to);

            $this->assertDatabaseHas('demands', ['id' => $demand->id, 'status' => $to, 'requester_id' => $this->requester->id]);
            $this->assertDatabaseHas('demand_movements', ['demand_id' => $demand->id, 'actor_id' => $this->stranger->id]);
        }
    }

    // Editar e excluir continuam com quem pediu ou com o administrador.
    public function test_stranger_still_cannot_edit_or_delete(): void
    {
        $demand = $this->demandIn('pending');

        $this->actingAsSpa($this->stranger)->putJson("/api/demands/{$demand->id}", [
            'title' => 'Outro', 'description' => 'Outra', 'category' => 'hr',
        ])->assertForbidden();
        $this->actingAsSpa($this->stranger)->deleteJson("/api/demands/{$demand->id}")->assertForbidden();

        $this->assertDatabaseHas('demands', ['id' => $demand->id]);
    }

    public function test_moving_does_not_change_content_or_requester(): void
    {
        $demand = Demand::factory()->create([
            'requester_id' => $this->requester->id,
            'title' => 'Título',
            'description' => 'Descrição',
            'category' => 'hr',
        ]);

        $this->actingAsSpa($this->admin)->postJson("/api/demands/{$demand->id}/start")->assertOk();
        $this->actingAsSpa($this->admin)->postJson("/api/demands/{$demand->id}/close")->assertOk();

        $this->assertDatabaseHas('demands', [
            'id' => $demand->id,
            'title' => 'Título',
            'description' => 'Descrição',
            'category' => 'hr',
            'requester_id' => $this->requester->id,
            'status' => 'finished',
        ]);
    }

    public function test_reopened_demand_can_be_edited_again(): void
    {
        $demand = $this->demandIn('finished');
        $payload = ['title' => 'Depois de reabrir', 'description' => 'Agora pode.', 'category' => 'it'];

        $this->actingAsSpa($this->requester)->putJson("/api/demands/{$demand->id}", $payload)->assertUnprocessable();
        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/reopen")->assertOk();
        $this->actingAsSpa($this->requester)->putJson("/api/demands/{$demand->id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.title', 'Depois de reabrir');
    }

    // Solicitação excluída não muda de situação.
    public function test_deleted_demand_is_not_found(): void
    {
        foreach (self::TRANSITIONS as $action => [$from]) {
            $demand = $this->demandIn($from);
            $demand->delete();

            $this->actingAsSpa($this->admin)->postJson("/api/demands/{$demand->id}/{$action}")->assertNotFound();
        }
    }

    public function test_malformed_id_is_not_found(): void
    {
        foreach (array_keys(self::TRANSITIONS) as $action) {
            $this->actingAsSpa($this->requester)->postJson("/api/demands/abc/{$action}")->assertNotFound();
        }
    }
}
