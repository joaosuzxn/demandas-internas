<?php

namespace App\Models;

use App\Enums\DemandMovementType;
use Database\Factories\DemandMovementFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Só de inserção, e só pelo DemandService: nada Fillable, sem updated_at.
class DemandMovement extends Model
{
    /** @use HasFactory<DemandMovementFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => DemandMovementType::class,
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Demand, $this>
     */
    public function demand(): BelongsTo
    {
        return $this->belongsTo(Demand::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
