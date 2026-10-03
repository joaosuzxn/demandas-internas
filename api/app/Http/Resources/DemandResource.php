<?php

namespace App\Http\Resources;

use App\Models\Demand;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Demand */
class DemandResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category->value,
            'status' => $this->status->value,
            // Só id e nome: a lista é visível a todos e o UserResource exporia CPF e e-mail.
            'requester' => [
                'id' => $this->requester->id,
                'name' => $this->requester->name,
            ],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            // Só no detalhe e nas respostas das ações (o controller carrega movements.actor); a listagem não traz.
            'history' => $this->whenLoaded('movements', fn () => $this->movements->map(fn ($movement) => [
                'id' => $movement->id,
                'type' => $movement->type->value,
                'actor' => [
                    'id' => $movement->actor->id,
                    'name' => $movement->actor->name,
                ],
                'created_at' => $movement->created_at?->toIso8601String(),
            ])->all()),
        ];
    }
}
