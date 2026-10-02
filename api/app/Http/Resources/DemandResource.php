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
        ];
    }
}
