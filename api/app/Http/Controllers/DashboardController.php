<?php

namespace App\Http\Controllers;

use App\Http\Requests\DashboardFiltersRequest;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

// Indicadores do dashboard (item 0030): uma rota por card da tela.
class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboard) {}

    public function summary(DashboardFiltersRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->dashboard->summary($request->validated())]);
    }

    public function categories(DashboardFiltersRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->dashboard->categories($request->validated())]);
    }

    public function trend(DashboardFiltersRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->dashboard->trend($request->validated())]);
    }
}
