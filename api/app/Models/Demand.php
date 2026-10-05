<?php

namespace App\Models;

use App\Enums\DemandCategory;
use App\Enums\DemandStatus;
use App\Support\BusinessDay;
use Database\Factories\DemandFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
     * Só a categoria pedida; sem categoria, todas. Usado pela busca do quadro e pelo dashboard.
     *
     * @param  Builder<Demand>  $query
     */
    public function scopeOfCategory(Builder $query, ?string $category): void
    {
        $query->when($category, fn (Builder $query) => $query->where('category', $category));
    }

    /**
     * Criadas entre dois dias (`Y-m-d`, inteiros, no fuso do negócio), convertidos para o UTC em que o banco grava.
     * Cada ponta vale sozinha.
     *
     * @param  Builder<Demand>  $query
     */
    public function scopeCreatedBetween(Builder $query, ?string $from, ?string $to): void
    {
        $query
            ->when($from, fn (Builder $query) => $query->where('created_at', '>=', BusinessDay::start($from)->utc()))
            ->when($to, fn (Builder $query) => $query->where('created_at', '<', BusinessDay::start($to)->addDay()->utc()));
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    /**
     * O histórico, na ordem em que aconteceu.
     *
     * @return HasMany<DemandMovement, $this>
     */
    public function movements(): HasMany
    {
        return $this->hasMany(DemandMovement::class)->orderBy('id');
    }
}
