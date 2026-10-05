<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    // Cabeçalhos que o navegador manda: sem eles o Sanctum não abre a sessão (api/CLAUDE.md, gotchas).
    protected function fromSpa(): static
    {
        return $this->withHeaders([
            'Origin' => 'http://localhost:8080',
            'Referer' => 'http://localhost:8080/',
        ]);
    }

    // Logado e com os cabeçalhos do navegador: a requisição como a SPA a faz.
    protected function actingAsSpa(User $user): static
    {
        $this->actingAs($user);

        return $this->fromSpa();
    }
}
