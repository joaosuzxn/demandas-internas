<?php

use App\Http\Controllers\HealthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

// Sem sessão: o health não pode depender da tabela sessions (banco fora → 500 em vez de 503).
Route::get('/health', HealthController::class)
    ->withoutMiddleware(EnsureFrontendRequestsAreStateful::class);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
