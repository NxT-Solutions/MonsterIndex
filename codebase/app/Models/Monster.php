<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Monster extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'size_label',
        'active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    public function monitors(): HasMany
    {
        return $this->hasMany(Monitor::class);
    }

    public function bestPrices(): HasMany
    {
        return $this->hasMany(BestPrice::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    public function suggestions(): HasMany
    {
        return $this->hasMany(MonsterSuggestion::class);
    }

    public function follows(): HasMany
    {
        return $this->hasMany(MonsterFollow::class);
    }

    public function contributorAlerts(): HasMany
    {
        return $this->hasMany(ContributorAlert::class);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
