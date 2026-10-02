<?php

namespace Tests\Feature\Demands;

use App\Models\Demand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemandUpdateDeleteTest extends TestCase
{
    use RefreshDatabase;

    private User $requester;

    private User $admin;

    private User $stranger;

    private Demand $demand;

    protected function setUp(): void
    {
        parent::setUp();
        $this->requester = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
        $this->stranger = User::factory()->create();
        $this->demand = Demand::factory()->create([
            'requester_id' => $this->requester->id,
            'title' => 'Título original',
            'description' => 'Descrição original',
            'category' => 'it',
        ]);
    }

    private function actingAsSpa(User $user): static
    {
        $this->actingAs($user);

        return $this->fromSpa();
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Título novo',
            'description' => 'Descrição nova',
            'category' => 'finance',
        ], $overrides);
    }

    public function test_guest_gets_unauthorized(): void
    {
        $this->fromSpa()->putJson("/api/demands/{$this->demand->id}", $this->validPayload())->assertUnauthorized();
        $this->fromSpa()->deleteJson("/api/demands/{$this->demand->id}")->assertUnauthorized();
    }

    public function test_requester_updates_own_demand(): void
    {
        $this->actingAsSpa($this->requester)->putJson("/api/demands/{$this->demand->id}", $this->validPayload())
            ->assertOk()
            ->assertJsonPath('data.title', 'Título novo')
            ->assertJsonPath('data.description', 'Descrição nova')
            ->assertJsonPath('data.category', 'finance')
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.requester.id', $this->requester->id);
    }

    public function test_admin_updates_demand_of_another_user_without_becoming_requester(): void
    {
        $this->actingAsSpa($this->admin)->putJson("/api/demands/{$this->demand->id}", $this->validPayload())
            ->assertOk()
            ->assertJsonPath('data.title', 'Título novo')
            ->assertJsonPath('data.requester.id', $this->requester->id);

        $this->assertDatabaseHas('demands', ['id' => $this->demand->id, 'requester_id' => $this->requester->id]);
    }

    public function test_stranger_cannot_update_or_delete(): void
    {
        // Payload válido: o 403 tem de vir da policy, não de uma falha de validação.
        $this->actingAsSpa($this->stranger)->putJson("/api/demands/{$this->demand->id}", $this->validPayload())
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado.');
        $this->actingAsSpa($this->stranger)->deleteJson("/api/demands/{$this->demand->id}")->assertForbidden();

        $this->assertDatabaseHas('demands', ['id' => $this->demand->id, 'title' => 'Título original', 'deleted_at' => null]);
    }

    public function test_update_requires_all_three_fields(): void
    {
        $this->actingAsSpa($this->requester)->putJson("/api/demands/{$this->demand->id}", ['title' => 'Só o título'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['description', 'category'])
            ->assertJsonMissingValidationErrors(['title']);

        $this->assertDatabaseHas('demands', ['id' => $this->demand->id, 'title' => 'Título original']);
    }

    public function test_update_rejects_invalid_data(): void
    {
        $this->actingAsSpa($this->requester)
            ->putJson("/api/demands/{$this->demand->id}", $this->validPayload(['title' => str_repeat('a', 151), 'category' => 'marketing']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'category']);
    }

    public function test_status_and_requester_are_prohibited_on_update(): void
    {
        $this->actingAsSpa($this->requester)
            ->putJson("/api/demands/{$this->demand->id}", $this->validPayload(['status' => 'closed', 'requester_id' => $this->stranger->id]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'requester_id']);

        $this->assertDatabaseHas('demands', [
            'id' => $this->demand->id,
            'status' => 'open',
            'requester_id' => $this->requester->id,
            'title' => 'Título original',
        ]);
    }

    public function test_closed_demand_cannot_be_edited(): void
    {
        $closed = Demand::factory()->closed()->create(['requester_id' => $this->requester->id, 'title' => 'Fechada']);

        foreach ([$this->requester, $this->admin] as $actor) {
            $this->actingAsSpa($actor)->putJson("/api/demands/{$closed->id}", $this->validPayload())
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['status' => 'Solicitação fechada não pode ser editada. Reabra antes de editar.']);
        }

        $this->assertDatabaseHas('demands', ['id' => $closed->id, 'title' => 'Fechada', 'status' => 'closed']);
    }

    public function test_requester_soft_deletes_own_demand(): void
    {
        $this->actingAsSpa($this->requester)->deleteJson("/api/demands/{$this->demand->id}")->assertNoContent();

        $this->assertSoftDeleted('demands', ['id' => $this->demand->id]);
        $this->assertDatabaseCount('demands', 1);
    }

    public function test_admin_deletes_demand_of_another_user(): void
    {
        $this->actingAsSpa($this->admin)->deleteJson("/api/demands/{$this->demand->id}")->assertNoContent();

        $this->assertSoftDeleted('demands', ['id' => $this->demand->id]);
    }

    public function test_closed_demand_can_be_deleted(): void
    {
        $closed = Demand::factory()->closed()->create(['requester_id' => $this->requester->id]);

        $this->actingAsSpa($this->requester)->deleteJson("/api/demands/{$closed->id}")->assertNoContent();

        $this->assertSoftDeleted('demands', ['id' => $closed->id]);
    }

    // Depois de excluída, a solicitação não existe mais para a API.
    public function test_deleted_demand_is_not_found_on_every_route(): void
    {
        $this->demand->delete();

        foreach ([$this->requester, $this->admin, $this->stranger] as $actor) {
            $this->actingAsSpa($actor)->getJson("/api/demands/{$this->demand->id}")->assertNotFound();
            $this->actingAsSpa($actor)->putJson("/api/demands/{$this->demand->id}", $this->validPayload())->assertNotFound();
            $this->actingAsSpa($actor)->deleteJson("/api/demands/{$this->demand->id}")->assertNotFound();
        }

        $this->assertDatabaseHas('demands', ['id' => $this->demand->id, 'title' => 'Título original']);
    }

    // O admin ainda cuida da solicitação de quem foi desativado.
    public function test_admin_manages_demand_of_deactivated_requester(): void
    {
        $this->requester->is_active = false;
        $this->requester->save();

        $this->actingAsSpa($this->admin)->putJson("/api/demands/{$this->demand->id}", $this->validPayload())
            ->assertOk()
            ->assertJsonPath('data.requester.id', $this->requester->id);
        $this->actingAsSpa($this->admin)->deleteJson("/api/demands/{$this->demand->id}")->assertNoContent();
    }
}
