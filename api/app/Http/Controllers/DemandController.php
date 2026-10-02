<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListDemandsRequest;
use App\Http\Requests\StoreDemandRequest;
use App\Http\Requests\UpdateDemandRequest;
use App\Http\Resources\DemandResource;
use App\Models\Demand;
use App\Services\DemandService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

// A autorização (DemandPolicy) é aplicada nas rotas, com ->can().
class DemandController extends Controller
{
    public function __construct(private readonly DemandService $demands) {}

    public function index(ListDemandsRequest $request): AnonymousResourceCollection
    {
        return DemandResource::collection($this->demands->paginate($request->validated(), $request->user()));
    }

    public function store(StoreDemandRequest $request): DemandResource
    {
        return new DemandResource($this->demands->create($request->validated(), $request->user()));
    }

    public function show(Demand $demand): DemandResource
    {
        return new DemandResource($demand);
    }

    public function update(UpdateDemandRequest $request, Demand $demand): DemandResource
    {
        return new DemandResource($this->demands->update($demand, $request->validated()));
    }

    public function destroy(Demand $demand): Response
    {
        $this->demands->delete($demand);

        return response()->noContent();
    }

    public function close(Demand $demand): DemandResource
    {
        return new DemandResource($this->demands->close($demand));
    }

    public function reopen(Demand $demand): DemandResource
    {
        return new DemandResource($this->demands->reopen($demand));
    }
}
