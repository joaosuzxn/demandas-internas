<?php

namespace App\Models;

use App\Enums\DemandCategory;
use App\Enums\DemandStatus;
use Database\Factories\DemandFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

// status e requester_id ficam fora do Fillable: só o DemandService os define.
#[Fillable(['title', 'description', 'category'])]
class Demand extends Model
{
    /** @use HasFactory<DemandFactory> */
    use HasFactory, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category' => DemandCategory::class,
            'status' => DemandStatus::class,
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }
}
