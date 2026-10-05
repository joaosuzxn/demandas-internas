<?php

namespace Tests\Feature;

use Tests\TestCase;

// O nginx só manda `/api` e `/sanctum` para o Laravel (ADR 0001); o resto é da SPA. Sem rotas do scaffold
// (página de boas-vindas em `/`, health em `/up`): o health da API é `GET /api/health`.
class ApiOnlyRoutesTest extends TestCase
{
    public function test_laravel_has_no_routes_outside_the_api(): void
    {
        $this->get('/')->assertNotFound();
        $this->get('/up')->assertNotFound();
    }
}
