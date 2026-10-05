<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListUsersRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

// A autorização (UserPolicy) é aplicada nas rotas, com ->can().
class UserController extends Controller
{
    public function __construct(private readonly UserService $users) {}

    public function index(ListUsersRequest $request): AnonymousResourceCollection
    {
        return UserResource::collection($this->users->paginate($request->validated('search')));
    }

    public function store(StoreUserRequest $request): UserResource
    {
        return new UserResource($this->users->create($request->validated()));
    }

    public function show(User $user): UserResource
    {
        return new UserResource($user);
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        return new UserResource($this->users->update($user, $request->validated()));
    }

    public function deactivate(Request $request, User $user): UserResource
    {
        return new UserResource($this->users->deactivate($user, $request->user()));
    }

    public function activate(User $user): UserResource
    {
        return new UserResource($this->users->activate($user));
    }

    public function resetPassword(Request $request, User $user): Response
    {
        $this->users->resetPassword($user, $request->user());

        return response()->noContent();
    }
}
