<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnalyticsPageView extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'visitor_id',
        'browser_session_id',
        'user_id',
        'route_name',
        'page_component',
        'page_kind',
        'path',
        'url',
        'title',
        'referrer_host',
        'referrer_url',
        'channel',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'device_type',
        'browser_family',
        'os_family',
        'locale',
        'is_authenticated',
        'viewport_width',
        'viewport_height',
        'max_scroll_depth',
        'duration_seconds',
        'viewed_at',
        'engaged_at',
        'last_seen_at',
        'ended_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_authenticated' => 'boolean',
            'viewport_width' => 'integer',
            'viewport_height' => 'integer',
            'max_scroll_depth' => 'integer',
            'duration_seconds' => 'integer',
            'viewed_at' => 'datetime',
            'engaged_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(AnalyticsEvent::class);
    }
}
