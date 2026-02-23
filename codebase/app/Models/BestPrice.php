<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BestPrice extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'monster_id',
        'snapshot_id',
        'effective_total_cents',
        'currency',
        'computed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'effective_total_cents' => 'integer',
            'computed_at' => 'datetime',
        ];
    }

    public function monster(): BelongsTo
    {
        return $this->belongsTo(Monster::class);
    }

    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(PriceSnapshot::class, 'snapshot_id');
    }
}
