<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Http\Middleware\EnsureUserIsActive;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

// Sem sessão: o health não pode depender da tabela sessions (banco fora → 500 em vez de 503).
Route::get('/health', HealthController::class)
    ->withoutMiddleware(EnsureFrontendRequestsAreStateful::class);

Route::post('/login', [AuthController::class, 'login'])->name('login');

// Todo o sistema exige a senha padrão trocada (spec §5.4); a lista de exceções é fechada e
// vigiada pelo PasswordChangeGuardTest. Rota nova entra aqui dentro, nunca fora do grupo.
Route::middleware(['auth:sanctum', EnsureUserIsActive::class, EnsurePasswordIsChanged::class])->group(function () {
    Route::withoutMiddleware(EnsurePasswordIsChanged::class)->group(function () {
        Route::get('/me', [ProfileController::class, 'show'])->name('me');
        Route::put('/me/password', [ProfileController::class, 'updatePassword'])->middleware('throttle:5,1')->name('me.password');
        Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    });

    Route::put('/me/photo', [ProfileController::class, 'updatePhoto'])->name('me.photo');

    Route::get('/users', [UserController::class, 'index'])->can('viewAny', User::class)->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->can('create', User::class)->name('users.store');
    Route::get('/users/{user}', [UserController::class, 'show'])->can('view', 'user')->name('users.show');
    Route::put('/users/{user}', [UserController::class, 'update'])->can('update', 'user')->name('users.update');
    Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate'])->can('deactivate', 'user')->name('users.deactivate');
    Route::post('/users/{user}/activate', [UserController::class, 'activate'])->can('activate', 'user')->name('users.activate');
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->can('resetPassword', 'user')->name('users.reset-password');
});
