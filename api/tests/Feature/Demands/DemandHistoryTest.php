<?php

namespace Tests\Feature\Demands;

use App\Models\Demand;
use App\Models\DemandMovement;
use App\Models\User;
use App\Services\DemandService;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

// Cada ação grava a sua movimentação, com quem fez; a resposta traz o histórico em ordem.
class DemandHistoryTest extends TestCase
{
    use RefreshDatabase;

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

    private function actingAsSpa(User $user): static
    {
        $this->actingAs($user);

        return $this->fromSpa();
    }

    /** @return array<int, array{0: string, 1: int}> */
    private function movementsOf(Demand $demand): array
    {
        return DemandMovement::query()->where('demand_id', $demand->id)->orderBy('id')
            ->get()->map(fn (DemandMovement $movement) => [$movement->type->value, $movement->actor_id])->all();
    }

    private function payload(array $overrides = []): array
    {
        return ['title' => 'Trocar impressora', 'description' => 'A do setor 2.', 'category' => 'it', ...$overrides];
    }

    public function test_full_lifecycle_records_every_movement_with_its_actor(): void
    {
        $id = $this->actingAsSpa($this->requester)->postJson('/api/demands', $this->payload())->assertCreated()->json('data.id');
        $demand = Demand::findOrFail($id);

        $this->actingAsSpa($this->requester)->putJson("/api/demands/{$id}", $this->payload(['title' => 'Trocar a impressora']))->assertOk();
        $this->actingAsSpa($this->admin)->postJson("/api/demands/{$id}/start")->assertOk();
        $this->actingAsSpa($this->admin)->postJson("/api/demands/{$id}/close")->assertOk();
        $response = $this->actingAsSpa($this->requester)->postJson("/api/demands/{$id}/reopen")->assertOk();

        $this->assertSame([
            ['created', $this->requester->id],
            ['edited', $this->requester->id],
            // Foco de revisão 1: quem age é o autor, mesmo na solicitação de outra pessoa.
            ['started', $this->admin->id],
            ['finished', $this->admin->id],
            ['reopened', $this->requester->id],
        ], $this->movementsOf($demand));

        $response
            ->assertJsonCount(5, 'data.history')
            ->assertJsonPath('data.history.0.type', 'created')
            ->assertJsonPath('data.history.4.type', 'reopened')
            ->assertJsonPath('data.history.4.actor', ['id' => $this->requester->id, 'name' => $this->requester->name]);
        $this->assertNotNull($response->json('data.history.4.created_at'));
        $this->assertArrayNotHasKey('email', $response->json('data.history.4.actor'));
    }

    public function test_show_returns_history_in_order_and_index_does_not(): void
    {
        $demand = Demand::factory()->create(['requester_id' => $this->requester->id]);
        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/start")->assertOk();
        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/close")->assertOk();

        $this->actingAsSpa($this->stranger)->getJson("/api/demands/{$demand->id}")
            ->assertOk()
            ->assertJsonPath('data.history.0.type', 'started')
            ->assertJsonPath('data.history.1.type', 'finished');

        $index = $this->actingAsSpa($this->stranger)->getJson('/api/demands')->assertOk();
        $this->assertArrayNotHasKey('history', $index->json('data.0'));
    }

    public function test_store_response_does_not_include_history(): void
    {
        $response = $this->actingAsSpa($this->requester)->postJson('/api/demands', $this->payload())->assertCreated();

        $this->assertArrayNotHasKey('history', $response->json('data'));
    }

    public function test_rejected_actions_record_nothing(): void
    {
        $demand = Demand::factory()->create(['requester_id' => $this->requester->id]);

        // 403: estranho editando. 422: situação errada (finalizar uma pendente) e edição de não pendente.
        $this->actingAsSpa($this->stranger)->putJson("/api/demands/{$demand->id}", $this->payload())->assertForbidden();
        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/close")->assertUnprocessable();
        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/reopen")->assertUnprocessable();

        $inProgress = Demand::factory()->inProgress()->create(['requester_id' => $this->requester->id]);
        $this->actingAsSpa($this->requester)->putJson("/api/demands/{$inProgress->id}", $this->payload())->assertUnprocessable();

        $this->assertDatabaseCount('demand_movements', 0);
    }

    // Foco de revisão 3: reenviar os mesmos valores (com espaços que o TrimStrings tira) não é edição.
    public function test_editing_without_changes_records_nothing(): void
    {
        $demand = Demand::factory()->create([
            'requester_id' => $this->requester->id,
            'title' => 'Trocar impressora',
            'description' => 'A do setor 2.',
            'category' => 'it',
        ]);

        $this->actingAsSpa($this->requester)
            ->putJson("/api/demands/{$demand->id}", $this->payload(['title' => '  Trocar impressora  ']))
            ->assertOk();

        $this->assertDatabaseCount('demand_movements', 0);
    }

    // Foco de revisão 3: mudar só a categoria (enum com cast) conta como edição.
    public function test_changing_only_the_category_records_an_edit(): void
    {
        $demand = Demand::factory()->create([
            'requester_id' => $this->requester->id,
            'title' => 'Trocar impressora',
            'description' => 'A do setor 2.',
            'category' => 'it',
        ]);

        $this->actingAsSpa($this->requester)
            ->putJson("/api/demands/{$demand->id}", $this->payload(['category' => 'infrastructure']))
            ->assertOk()
            ->assertJsonPath('data.history.0.type', 'edited');

        $this->assertSame([['edited', $this->requester->id]], $this->movementsOf($demand));
    }

    // Foco de revisão 2: se a movimentação não grava, a mudança de situação é desfeita junto.
    public function test_failure_to_record_rolls_back_the_status_change(): void
    {
        $demand = Demand::factory()->create(['requester_id' => $this->requester->id]);
        DemandMovement::creating(fn () => throw ValidationException::withMessages(['status' => 'falha simulada']));

        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/start")->assertUnprocessable();

        $this->assertDatabaseHas('demands', ['id' => $demand->id, 'status' => 'pending']);
        $this->assertDatabaseCount('demand_movements', 0);
    }

    // Foco de revisão 4: desativar o autor não apaga o nome dele do histórico.
    public function test_deactivated_actor_still_shows_in_history(): void
    {
        $demand = Demand::factory()->create(['requester_id' => $this->requester->id]);
        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/start")->assertOk();
        $this->requester->forceFill(['is_active' => false])->save();

        $this->actingAsSpa($this->admin)->getJson("/api/demands/{$demand->id}")
            ->assertOk()
            ->assertJsonPath('data.history.0.actor.name', $this->requester->name);
    }

    // Revisão final (I1): uma segunda aba com a solicitação carregada antes não pode passar pela checagem
    // de situação com dados velhos — senão o histórico grava "Iniciada" duas vezes, para sempre.
    public function test_stale_copy_cannot_start_an_already_started_demand(): void
    {
        $demand = Demand::factory()->create(['requester_id' => $this->requester->id]);
        $stale = Demand::findOrFail($demand->id);
        $service = app(DemandService::class);

        $service->start($demand, $this->requester);

        try {
            $service->start($stale, $this->admin);
            $this->fail('A cópia velha não deveria iniciar de novo.');
        } catch (ValidationException) {
            // esperado: a situação conferida é a do banco, não a da cópia
        }

        $this->assertSame([['started', $this->requester->id]], $this->movementsOf($demand));
    }

    // Revisão final (I1): edição vinda de uma cópia de quando a solicitação ainda era pendente não grava
    // numa solicitação já iniciada, nem deixa "Editada" depois de "Iniciada".
    public function test_stale_copy_cannot_edit_a_started_demand(): void
    {
        $demand = Demand::factory()->create(['requester_id' => $this->requester->id, 'title' => 'Original']);
        $stale = Demand::findOrFail($demand->id);
        $service = app(DemandService::class);

        $service->start($demand, $this->admin);

        try {
            $service->update($stale, $this->payload(['title' => 'Editada depois']), $this->requester);
            $this->fail('A cópia velha não deveria editar uma solicitação iniciada.');
        } catch (ValidationException) {
            // esperado
        }

        $this->assertDatabaseHas('demands', ['id' => $demand->id, 'title' => 'Original', 'status' => 'in_progress']);
        $this->assertSame([['started', $this->admin->id]], $this->movementsOf($demand));
    }

    // Os testes de cópia velha acima provam a releitura, não a trava: rodam um depois do outro. Este garante
    // que cada ação relê com `FOR UPDATE`, que é o que faz duas ações simultâneas passarem uma de cada vez.
    public function test_each_action_rereads_the_demand_locking_the_row(): void
    {
        $service = app(DemandService::class);
        $locks = 0;
        DB::listen(function (QueryExecuted $query) use (&$locks): void {
            if (str_contains(strtolower($query->sql), 'for update')) {
                $locks++;
            }
        });

        $demand = Demand::factory()->create(['requester_id' => $this->requester->id]);
        $service->update($demand, $this->payload(['title' => 'Outro título']), $this->requester);
        $service->start($demand, $this->admin);
        $service->close($demand, $this->admin);
        $service->reopen($demand, $this->admin);
        $service->delete($demand);

        $this->assertSame(5, $locks);
    }
}
