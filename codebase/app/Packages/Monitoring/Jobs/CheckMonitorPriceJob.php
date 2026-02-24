<?php

namespace Packages\Monitoring\Jobs;

use App\Models\Monitor;
use App\Models\MonitorRun;
use App\Models\PriceSnapshot;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Packages\Monitoring\Services\BestPriceProjector;
use Packages\Monitoring\Services\DomainRateLimiter;
use Packages\Contributions\Services\ContributorAlertService;
use Packages\PriceExtraction\Services\PriceExtractionService;
use Throwable;

class CheckMonitorPriceJob implements ShouldQueue
{
    use Queueable;

    /**
     * @var int
     */
    public $tries = 3;

    /**
     * @return list<int>
     */
    public function backoff(): array
    {
        return [30, 120];
    }

    public function __construct(
        private readonly int $monitorId,
        private readonly string $triggeredBy = 'manual',
        private readonly ?int $monitorRunId = null,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(
        PriceExtractionService $priceExtractionService,
        DomainRateLimiter $domainRateLimiter,
        BestPriceProjector $bestPriceProjector,
        ContributorAlertService $contributorAlertService,
    ): void {
        $monitor = Monitor::query()
            ->with(['site', 'monster'])
            ->find($this->monitorId);

        if (! $monitor || ! $monitor->canRunScheduledChecks()) {
            return;
        }

        $run = $this->resolveRun($monitor->id);

        try {
            $domain = $monitor->site?->domain ?: (string) parse_url($monitor->product_url, PHP_URL_HOST);
            $waitSeconds = $domainRateLimiter->secondsUntilAvailable($domain);
            if ($waitSeconds > 0) {
                $run->update([
                    'status' => 'rate_limited',
                    'finished_at' => now(),
                    'error_message' => "Released for {$waitSeconds} seconds due to domain rate limit.",
                ]);

                $this->release($waitSeconds);

                return;
            }

            $result = $priceExtractionService->extract($monitor, allowHeadlessFallback: true);

            $snapshot = PriceSnapshot::query()->create([
                'monitor_id' => $monitor->id,
                'checked_at' => now(),
                'price_cents' => $result->priceCents,
                'shipping_cents' => $result->shippingCents,
                'effective_total_cents' => $result->effectiveTotalCents,
                'can_count' => $result->canCount,
                'price_per_can_cents' => $result->pricePerCanCents,
                'currency' => (string) ($monitor->currency ?: Monitor::DEFAULT_CURRENCY),
                'availability' => $result->availability,
                'raw_text' => $result->rawText,
                'status' => $result->status,
                'error_code' => $result->errorCode,
            ]);

            $bestPriceProjector->projectFromSnapshot($snapshot);
            $contributorAlertService->handleSnapshot($snapshot, $monitor);

            $run->update([
                'status' => $result->status === 'failed' ? 'failed' : 'success',
                'finished_at' => now(),
                'error_message' => $result->errorCode,
            ]);
        } catch (Throwable $exception) {
            $run->update([
                'status' => 'error',
                'finished_at' => now(),
                'error_message' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }

    private function resolveRun(int $monitorId): MonitorRun
    {
        if ($this->monitorRunId !== null) {
            $existingRun = MonitorRun::query()
                ->where('id', $this->monitorRunId)
                ->where('monitor_id', $monitorId)
                ->first();

            if ($existingRun) {
                $existingRun->update([
                    'started_at' => now(),
                    'finished_at' => null,
                    'status' => 'running',
                    'attempt' => $this->attempts(),
                    'error_message' => null,
                ]);

                return $existingRun->refresh();
            }
        }

        return MonitorRun::query()->create([
            'monitor_id' => $monitorId,
            'started_at' => now(),
            'status' => 'running',
            'attempt' => $this->attempts(),
        ]);
    }
}
