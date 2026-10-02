<?php

namespace Tests;

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
}
