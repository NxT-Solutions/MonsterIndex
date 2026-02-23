<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriceSnapshot extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'monitor_id',
        'checked_at',
        'price_cents',
        'shipping_cents',
        'effective_total_cents',
        'currency',
        'availability',
        'raw_text',
        'status',
        'error_code',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'checked_at' => 'datetime',
            'price_cents' => 'integer',
            'shipping_cents' => 'integer',
            'effective_total_cents' => 'integer',
        ];
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }
}
