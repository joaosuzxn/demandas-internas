<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function login(LoginRequest $request): UserResource
    {
        $user = $this->auth->login(
            $request->validated('login'),
            $request->validated('password'),
            (string) $request->ip(),
            $request->boolean('remember'),
        );

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // A SPA lê must_change_password desta resposta para abrir a troca de senha (spec §5.4).
        return new UserResource($user);
    }

    public function logout(Request $request): Response
    {
        $this->auth->logout($request);

        return response()->noContent();
    }
}
