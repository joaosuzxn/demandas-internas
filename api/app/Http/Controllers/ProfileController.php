<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\UpdatePhotoRequest;
use App\Http\Resources\UserResource;
use App\Services\ProfileService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class ProfileController extends Controller
{
    public function __construct(private readonly ProfileService $profile) {}

    public function show(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function updatePhoto(UpdatePhotoRequest $request): UserResource
    {
        return new UserResource($this->profile->updatePhoto($request->user(), $request->validated('photo')));
    }

    public function updatePassword(ChangePasswordRequest $request): Response
    {
        $recaller = $request->cookie(Auth::guard('web')->getRecallerName());

        $this->profile->changePassword(
            $request->user(),
            $request->validated('password'),
            is_string($recaller) ? $recaller : null,
        );

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->noContent();
    }
}
