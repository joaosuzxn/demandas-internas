<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Erros da API em português e sem vazar detalhes internos (nome de model, classe de exceção).
class ErrorResponsesTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_returns_portuguese_message(): void
    {
        $this->fromSpa()->getJson('/api/me')
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Não autenticado.']);
    }

    public function test_forbidden_returns_portuguese_message(): void
    {
        $this->actingAs(User::factory()->create());

        $this->fromSpa()->getJson('/api/users')
            ->assertForbidden()
            ->assertExactJson(['message' => 'Acesso negado.']);
    }

    public function test_not_found_returns_portuguese_message_without_model_name(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $response = $this->fromSpa()->getJson('/api/users/999999')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Registro não encontrado.']);

        $this->assertStringNotContainsString('App\\Models', $response->getContent());
    }

    public function test_unknown_route_returns_portuguese_not_found(): void
    {
        $this->fromSpa()->getJson('/api/nao-existe')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Registro não encontrado.']);
    }

    public function test_generic_throttle_returns_portuguese_message_and_retry_after(): void
    {
        $this->actingAs(User::factory()->create(['password' => 'Minha@Senha1']));
        $payload = ['current_password' => 'errada', 'password' => 'Nova@Senha1', 'password_confirmation' => 'Nova@Senha1'];

        foreach (range(1, 5) as $attempt) {
            $this->fromSpa()->putJson('/api/me/password', $payload)->assertUnprocessable();
        }

        $response = $this->fromSpa()->putJson('/api/me/password', $payload)->assertTooManyRequests();

        $this->assertMatchesRegularExpression(
            '/^Muitas tentativas\. Tente novamente em \d+ segundos\.$/',
            $response->json('message'),
        );
        $this->assertGreaterThan(0, (int) $response->headers->get('Retry-After'));
    }
}
