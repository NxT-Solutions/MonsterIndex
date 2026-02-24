<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Monitor extends Model
{
    use HasFactory;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PENDING_REVIEW = 'pending_review';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_WITHDRAWN = 'withdrawn';

    public const VALIDATION_PENDING = 'pending';

    public const VALIDATION_SUCCESS = 'success';

    public const VALIDATION_FAILED = 'failed';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'monster_id',
        'site_id',
        'created_by_user_id',
        'approved_by_user_id',
        'rejected_by_user_id',
        'product_url',
        'canonical_product_url',
        'selector_config',
        'currency',
        'check_interval_minutes',
        'next_check_at',
        'active',
        'submission_status',
        'approved_at',
        'rejected_at',
        'review_note',
        'validation_status',
        'validation_checked_at',
        'validation_result',
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
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'validation_checked_at' => 'datetime',
            'validation_result' => 'array',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function rejecter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(PriceSnapshot::class);
    }

    public function latestSnapshot(): HasOne
    {
        return $this->hasOne(PriceSnapshot::class)->latestOfMany('checked_at');
    }

    public function latestRun(): HasOne
    {
        return $this->hasOne(MonitorRun::class)->latestOfMany('started_at');
    }

    public function runs(): HasMany
    {
        return $this->hasMany(MonitorRun::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('submission_status', self::STATUS_APPROVED);
    }

    public function scopeOwnedBy(Builder $query, int $userId): Builder
    {
        return $query->where('created_by_user_id', $userId);
    }

    public function isApproved(): bool
    {
        return $this->submission_status === self::STATUS_APPROVED;
    }

    public function canRunScheduledChecks(): bool
    {
        return $this->active && $this->isApproved();
    }

    public function scheduleNextCheck(?CarbonInterface $now = null): void
    {
        $now ??= now();

        $this->next_check_at = $now->toImmutable()->addMinutes(max(1, $this->check_interval_minutes));
    }
}
