<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalyticsEvent extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'analytics_page_view_id',
        'visitor_id',
        'browser_session_id',
        'user_id',
        'event_name',
        'route_name',
        'page_kind',
        'path',
        'label',
        'target_host',
        'target_url',
        'scroll_depth',
        'properties',
        'occurred_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scroll_depth' => 'integer',
            'properties' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    public function pageView(): BelongsTo
    {
        return $this->belongsTo(AnalyticsPageView::class, 'analytics_page_view_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
