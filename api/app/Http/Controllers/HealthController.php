<?php

namespace App\Http\Controllers;

use App\Services\HealthCheck;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(HealthCheck $health): JsonResponse
    {
        $databaseOk = $health->database();

        return response()->json([
            'status' => $databaseOk ? 'ok' : 'erro',
            'app' => config('app.name'),
            'database' => $databaseOk ? 'ok' : 'erro',
        ], $databaseOk ? 200 : 503);
    }
}
