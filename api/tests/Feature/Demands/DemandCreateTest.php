<?php

namespace Tests\Feature\Demands;

use App\Models\Demand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemandCreateTest extends TestCase
{
    use RefreshDatabase;

    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();
        $this->employee = User::factory()->create(['name' => 'Maria Souza']);
    }

    private function actingAsSpa(User $user): static
    {
        $this->actingAs($user);

        return $this->fromSpa();
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Trocar o monitor da recepção',
            'description' => 'O monitor apaga sozinho várias vezes por dia.',
            'category' => 'it',
        ], $overrides);
    }

    public function test_guest_gets_unauthorized(): void
    {
        $this->fromSpa()->postJson('/api/demands', $this->validPayload())->assertUnauthorized();
        $this->fromSpa()->getJson('/api/demands/1')->assertUnauthorized();
    }

    public function test_employee_creates_open_demand_as_requester(): void
    {
        $response = $this->actingAsSpa($this->employee)->postJson('/api/demands', $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('data.title', 'Trocar o monitor da recepção')
            ->assertJsonPath('data.description', 'O monitor apaga sozinho várias vezes por dia.')
            ->assertJsonPath('data.category', 'it')
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.requester', ['id' => $this->employee->id, 'name' => 'Maria Souza']);

        $this->assertDatabaseHas('demands', [
            'id' => $response->json('data.id'),
            'status' => 'open',
            'requester_id' => $this->employee->id,
            'deleted_at' => null,
        ]);
    }

    public function test_status_and_requester_are_prohibited_on_create(): void
    {
        $other = User::factory()->create();

        $this->actingAsSpa($this->employee)
            ->postJson('/api/demands', $this->validPayload(['status' => 'closed', 'requester_id' => $other->id]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'status' => 'O campo status não é permitido.',
                'requester_id' => 'O campo solicitante não é permitido.',
            ]);

        $this->assertDatabaseCount('demands', 0);
    }

    public function test_required_fields(): void
    {
        $this->actingAsSpa($this->employee)->postJson('/api/demands', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'title' => 'O campo título é obrigatório.',
                'description' => 'O campo descrição é obrigatório.',
                'category' => 'O campo categoria é obrigatório.',
            ]);
    }

    public function test_whitespace_only_text_is_rejected_as_empty(): void
    {
        $this->actingAsSpa($this->employee)
            ->postJson('/api/demands', $this->validPayload(['title' => '   ', 'description' => "\n\t "]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'description']);
    }

    public function test_surrounding_whitespace_is_trimmed(): void
    {
        $this->actingAsSpa($this->employee)
            ->postJson('/api/demands', $this->validPayload(['title' => '  Cadeira quebrada  ']))
            ->assertCreated()
            ->assertJsonPath('data.title', 'Cadeira quebrada');
    }

    public function test_category_outside_the_enum_is_rejected(): void
    {
        foreach (['TI', 'marketing', 123, ['it']] as $category) {
            $this->actingAsSpa($this->employee)
                ->postJson('/api/demands', $this->validPayload(['category' => $category]))
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['category']);
        }
    }

    public function test_every_category_is_accepted(): void
    {
        foreach (['it', 'hr', 'purchasing', 'finance', 'infrastructure'] as $category) {
            $this->actingAsSpa($this->employee)
                ->postJson('/api/demands', $this->validPayload(['category' => $category]))
                ->assertCreated()
                ->assertJsonPath('data.category', $category);
        }
    }

    // O limite conta caracteres, não bytes.
    public function test_text_limits_count_characters_not_bytes(): void
    {
        $title = str_repeat('ç', 149).'🙂';
        $description = str_repeat('ã', 4999).'🙂';

        $this->actingAsSpa($this->employee)
            ->postJson('/api/demands', $this->validPayload(['title' => $title, 'description' => $description]))
            ->assertCreated()
            ->assertJsonPath('data.title', $title)
            ->assertJsonPath('data.description', $description);

        $this->actingAsSpa($this->employee)
            ->postJson('/api/demands', $this->validPayload(['title' => $title.'a', 'description' => $description.'a']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'title' => 'O campo título não pode ter mais de 150 caracteres.',
                'description' => 'O campo descrição não pode ter mais de 5000 caracteres.',
            ]);
    }

    public function test_non_string_text_is_rejected(): void
    {
        $this->actingAsSpa($this->employee)
            ->postJson('/api/demands', $this->validPayload(['title' => ['a'], 'description' => 123]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'description']);
    }

    public function test_any_user_sees_a_demand_of_another_user(): void
    {
        $demand = Demand::factory()->create(['requester_id' => $this->employee->id, 'title' => 'Da Maria']);

        $this->actingAsSpa(User::factory()->create())->getJson("/api/demands/{$demand->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $demand->id)
            ->assertJsonPath('data.title', 'Da Maria')
            ->assertJsonPath('data.requester.name', 'Maria Souza');
    }

    public function test_requester_exposes_only_id_and_name(): void
    {
        $demand = Demand::factory()->create(['requester_id' => $this->employee->id]);

        $requester = $this->actingAsSpa($this->employee)->getJson("/api/demands/{$demand->id}")
            ->assertOk()
            ->json('data.requester');

        $this->assertSame(['id', 'name'], array_keys($requester));
    }

    public function test_dates_use_the_same_format_as_users(): void
    {
        $demand = Demand::factory()->create();

        $this->actingAsSpa($this->employee)->getJson("/api/demands/{$demand->id}")
            ->assertJsonPath('data.created_at', $demand->created_at->toIso8601String())
            ->assertJsonPath('data.updated_at', $demand->updated_at->toIso8601String());
    }

    // Id que não é número ou não cabe no bigint dá 404, não erro do banco.
    public function test_unknown_or_malformed_id_is_not_found(): void
    {
        foreach (['999999', 'abc', '1.5', '-1', '99999999999999999999'] as $id) {
            $this->actingAsSpa($this->employee)->getJson("/api/demands/{$id}")
                ->assertNotFound()
                ->assertJsonPath('message', 'Registro não encontrado.');
        }
    }

    public function test_user_with_pending_password_change_is_blocked(): void
    {
        $pending = User::factory()->mustChangePassword()->create();

        $this->actingAsSpa($pending)->postJson('/api/demands', $this->validPayload())
            ->assertForbidden()
            ->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');
    }
}
