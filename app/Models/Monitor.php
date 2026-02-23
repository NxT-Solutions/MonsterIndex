<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Monitor extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'monster_id',
        'site_id',
        'product_url',
        'selector_config',
        'currency',
        'check_interval_minutes',
        'next_check_at',
        'active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'selector_config' => 'array',
            'check_interval_minutes' => 'integer',
            'next_check_at' => 'datetime',
            'active' => 'boolean',
        ];
    }

    public function monster(): BelongsTo
    {
        return $this->belongsTo(Monster::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(PriceSnapshot::class);
    }

    public function latestSnapshot(): HasOne
    {
        return $this->hasOne(PriceSnapshot::class)->latestOfMany('checked_at');
    }

    public function runs(): HasMany
    {
        return $this->hasMany(MonitorRun::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    public function scheduleNextCheck(?CarbonInterface $now = null): void
    {
        $now ??= now();

        $this->next_check_at = $now->toImmutable()->addMinutes(max(1, $this->check_interval_minutes));
    }
}
