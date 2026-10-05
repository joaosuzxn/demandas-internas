<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListDemandsRequest;
use App\Http\Requests\SearchDemandsRequest;
use App\Http\Requests\StoreDemandRequest;
use App\Http\Requests\UpdateDemandRequest;
use App\Http\Resources\DemandResource;
use App\Models\Demand;
use App\Services\DemandService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

// A autorização (DemandPolicy) é aplicada nas rotas, com ->can().
class DemandController extends Controller
{
    public function __construct(private readonly DemandService $demands) {}

    public function index(ListDemandsRequest $request): AnonymousResourceCollection
    {
        return DemandResource::collection($this->demands->paginate($request->validated()));
    }

    public function search(SearchDemandsRequest $request): AnonymousResourceCollection
    {
        return DemandResource::collection($this->demands->paginate($request->validated()));
    }

    public function store(StoreDemandRequest $request): DemandResource
    {
        return new DemandResource($this->demands->create($request->validated(), $request->user()));
    }

    public function show(Demand $demand): DemandResource
    {
        return $this->withHistory($demand);
    }

    public function update(UpdateDemandRequest $request, Demand $demand): DemandResource
    {
        return $this->withHistory($this->demands->update($demand, $request->validated(), $request->user()));
    }

    public function destroy(Demand $demand): Response
    {
        $this->demands->delete($demand);

        return response()->noContent();
    }

    public function start(Request $request, Demand $demand): DemandResource
    {
        return $this->withHistory($this->demands->start($demand, $request->user()));
    }

    public function close(Request $request, Demand $demand): DemandResource
    {
        return $this->withHistory($this->demands->close($demand, $request->user()));
    }

    public function reopen(Request $request, Demand $demand): DemandResource
    {
        return $this->withHistory($this->demands->reopen($demand, $request->user()));
    }

    // A solicitação com o histórico e quem fez cada movimentação: a resposta de ver e de toda ação.
    private function withHistory(Demand $demand): DemandResource
    {
        return new DemandResource($demand->load('movements.actor'));
    }
}
