<?php

namespace Tests\Feature;

use Tests\TestCase;

class SanctumCsrfTest extends TestCase
{
    public function test_csrf_cookie_define_xsrf_token_para_a_spa(): void
    {
        $this->withHeaders([
            'Origin' => 'http://localhost:8080',
            'Referer' => 'http://localhost:8080/',
        ])->get('/sanctum/csrf-cookie')
            ->assertNoContent()
            ->assertCookie('XSRF-TOKEN');
    }
}
