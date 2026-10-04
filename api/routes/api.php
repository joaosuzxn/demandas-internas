<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DemandController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Http\Middleware\EnsureUserIsActive;
use App\Models\Demand;
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

    Route::get('/users', [UserController::class, 'index'])->can('viewAny', User::class)->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->can('create', User::class)->name('users.store');
    Route::get('/users/{user}', [UserController::class, 'show'])->can('view', 'user')->name('users.show');
    Route::put('/users/{user}', [UserController::class, 'update'])->can('update', 'user')->name('users.update');
    Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate'])->can('deactivate', 'user')->name('users.deactivate');
    Route::post('/users/{user}/activate', [UserController::class, 'activate'])->can('activate', 'user')->name('users.activate');
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->can('resetPassword', 'user')->name('users.reset-password');

    Route::get('/dashboard/summary', [DashboardController::class, 'summary'])->can('viewAny', Demand::class)->name('dashboard.summary');
    Route::get('/dashboard/categories', [DashboardController::class, 'categories'])->can('viewAny', Demand::class)->name('dashboard.categories');
    Route::get('/dashboard/trend', [DashboardController::class, 'trend'])->can('viewAny', Demand::class)->name('dashboard.trend');

    // Só dígitos (até 18) no id: texto ou número fora do bigint dá 404 em vez de erro do PostgreSQL.
    Route::where(['demand' => '[0-9]{1,18}'])->group(function () {
        Route::get('/demands', [DemandController::class, 'index'])->can('viewAny', Demand::class)->name('demands.index');
        // Não colide com /demands/{demand}: o {demand} só aceita número.
        Route::get('/demands/search', [DemandController::class, 'search'])->can('viewAny', Demand::class)->name('demands.search');
        Route::post('/demands', [DemandController::class, 'store'])->can('create', Demand::class)->name('demands.store');
        Route::get('/demands/{demand}', [DemandController::class, 'show'])->can('view', 'demand')->name('demands.show');
        Route::put('/demands/{demand}', [DemandController::class, 'update'])->can('update', 'demand')->name('demands.update');
        Route::delete('/demands/{demand}', [DemandController::class, 'destroy'])->can('delete', 'demand')->name('demands.destroy');
        Route::post('/demands/{demand}/start', [DemandController::class, 'start'])->can('start', 'demand')->name('demands.start');
        Route::post('/demands/{demand}/close', [DemandController::class, 'close'])->can('close', 'demand')->name('demands.close');
        Route::post('/demands/{demand}/reopen', [DemandController::class, 'reopen'])->can('reopen', 'demand')->name('demands.reopen');
    });
});
