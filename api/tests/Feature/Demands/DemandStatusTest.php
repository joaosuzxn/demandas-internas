<?php

namespace Tests\Feature\Demands;

use App\Models\Demand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemandStatusTest extends TestCase
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

    private function openDemand(): Demand
    {
        return Demand::factory()->create(['requester_id' => $this->requester->id]);
    }

    private function closedDemand(): Demand
    {
        return Demand::factory()->closed()->create(['requester_id' => $this->requester->id]);
    }

    public function test_guest_gets_unauthorized(): void
    {
        $demand = $this->openDemand();

        $this->fromSpa()->postJson("/api/demands/{$demand->id}/close")->assertUnauthorized();
        $this->fromSpa()->postJson("/api/demands/{$demand->id}/reopen")->assertUnauthorized();
    }

    public function test_requester_and_admin_close_an_open_demand(): void
    {
        foreach ([$this->requester, $this->admin] as $actor) {
            $demand = $this->openDemand();

            $this->actingAsSpa($actor)->postJson("/api/demands/{$demand->id}/close")
                ->assertOk()
                ->assertJsonPath('data.id', $demand->id)
                ->assertJsonPath('data.status', 'closed')
                ->assertJsonPath('data.requester.id', $this->requester->id);

            $this->assertDatabaseHas('demands', ['id' => $demand->id, 'status' => 'closed']);
        }
    }

    public function test_requester_and_admin_reopen_a_closed_demand(): void
    {
        foreach ([$this->requester, $this->admin] as $actor) {
            $demand = $this->closedDemand();

            $this->actingAsSpa($actor)->postJson("/api/demands/{$demand->id}/reopen")
                ->assertOk()
                ->assertJsonPath('data.status', 'open');

            $this->assertDatabaseHas('demands', ['id' => $demand->id, 'status' => 'open']);
        }
    }

    public function test_stranger_cannot_close_or_reopen(): void
    {
        $open = $this->openDemand();
        $closed = $this->closedDemand();

        $this->actingAsSpa($this->stranger)->postJson("/api/demands/{$open->id}/close")->assertForbidden();
        $this->actingAsSpa($this->stranger)->postJson("/api/demands/{$closed->id}/reopen")->assertForbidden();

        $this->assertDatabaseHas('demands', ['id' => $open->id, 'status' => 'open']);
        $this->assertDatabaseHas('demands', ['id' => $closed->id, 'status' => 'closed']);
    }

    public function test_closing_a_closed_demand_is_rejected(): void
    {
        $demand = $this->closedDemand();

        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/close")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Esta solicitação já está fechada.']);
    }

    public function test_reopening_an_open_demand_is_rejected(): void
    {
        $demand = $this->openDemand();

        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/reopen")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Esta solicitação já está aberta.']);
    }

    public function test_closing_does_not_change_content_or_requester(): void
    {
        $demand = Demand::factory()->create([
            'requester_id' => $this->requester->id,
            'title' => 'Título',
            'description' => 'Descrição',
            'category' => 'hr',
        ]);

        $this->actingAsSpa($this->admin)->postJson("/api/demands/{$demand->id}/close")->assertOk();

        $this->assertDatabaseHas('demands', [
            'id' => $demand->id,
            'title' => 'Título',
            'description' => 'Descrição',
            'category' => 'hr',
            'requester_id' => $this->requester->id,
        ]);
    }

    public function test_reopened_demand_can_be_edited_again(): void
    {
        $demand = $this->closedDemand();
        $payload = ['title' => 'Depois de reabrir', 'description' => 'Agora pode.', 'category' => 'it'];

        $this->actingAsSpa($this->requester)->putJson("/api/demands/{$demand->id}", $payload)->assertUnprocessable();
        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$demand->id}/reopen")->assertOk();
        $this->actingAsSpa($this->requester)->putJson("/api/demands/{$demand->id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.title', 'Depois de reabrir');
    }

    // Solicitação excluída não fecha nem reabre.
    public function test_deleted_demand_is_not_found(): void
    {
        $open = $this->openDemand();
        $closed = $this->closedDemand();
        $open->delete();
        $closed->delete();

        $this->actingAsSpa($this->requester)->postJson("/api/demands/{$open->id}/close")->assertNotFound();
        $this->actingAsSpa($this->admin)->postJson("/api/demands/{$closed->id}/reopen")->assertNotFound();
    }

    public function test_malformed_id_is_not_found(): void
    {
        $this->actingAsSpa($this->requester)->postJson('/api/demands/abc/close')->assertNotFound();
        $this->actingAsSpa($this->requester)->postJson('/api/demands/abc/reopen')->assertNotFound();
    }
}
