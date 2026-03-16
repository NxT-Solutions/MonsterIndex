<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Models\MonitorRun;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Packages\Monitoring\Jobs\CheckMonitorPriceJob;
use Packages\Monitoring\Services\BestPriceProjector;

class MonitorReviewController extends Controller
{
    public function __construct(
        private readonly BestPriceProjector $bestPriceProjector,
    ) {}

    public function index(): Response
    {
        $pending = Monitor::query()
            ->where('submission_status', Monitor::STATUS_PENDING_REVIEW)
            ->with([
                'monster:id,name,slug,size_label',
                'site:id,name,domain',
                'creator:id,name,email',
            ])
            ->latest('updated_at')
            ->get();

        return Inertia::render('Admin/Review/Monitors', [
            'pendingMonitors' => $pending,
        ]);
    }

    public function approve(Request $request, Monitor $monitor): RedirectResponse
    {
        $this->authorize('approve', $monitor);

        if ($monitor->validation_status !== Monitor::VALIDATION_SUCCESS) {
            return back()->withErrors([
                'monitor' => __('Validation has not succeeded. Use force-approve if this monitor should still be accepted.'),
            ]);
        }

        $this->transitionToApproved($request, $monitor, forced: false);

        return back()->with('success', __('Monitor proposal approved.'));
    }

    public function forceApprove(Request $request, Monitor $monitor): RedirectResponse
    {
        $this->authorize('forceApprove', $monitor);

        $this->transitionToApproved($request, $monitor, forced: true);

        return back()->with('success', __('Monitor proposal force-approved.'));
    }

    public function reject(Request $request, Monitor $monitor): RedirectResponse
    {
        $this->authorize('reject', $monitor);

        $validated = $request->validate([
            'review_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $wasApproved = $monitor->submission_status === Monitor::STATUS_APPROVED;

        $monitor->forceFill([
            'submission_status' => Monitor::STATUS_REJECTED,
            'active' => false,
            'next_check_at' => null,
            'rejected_by_user_id' => $request->user()?->id,
            'rejected_at' => now(),
            'review_note' => $validated['review_note'] ?? __('Rejected during moderation.'),
        ])->save();

        if ($wasApproved) {
            $this->bestPriceProjector->recomputeForMonsterCurrency(
                (int) $monitor->monster_id,
                (string) $monitor->currency,
            );
        }

        return back()->with('success', __('Monitor proposal rejected.'));
    }

    private function transitionToApproved(Request $request, Monitor $monitor, bool $forced): void
    {
        $validationResult = is_array($monitor->validation_result) ? $monitor->validation_result : [];
        if ($forced) {
            $validationResult['forced_approval'] = true;
            $validationResult['forced_by'] = $request->user()?->id;
            $validationResult['forced_at'] = now()->toIso8601String();
        }

        $monitor->forceFill([
            'submission_status' => Monitor::STATUS_APPROVED,
            'active' => true,
            'approved_by_user_id' => $request->user()?->id,
            'approved_at' => now(),
            'rejected_by_user_id' => null,
            'rejected_at' => null,
            'review_note' => null,
            'validation_result' => $validationResult,
        ]);

        if (! $monitor->next_check_at) {
            $monitor->scheduleNextCheck(now());
        }

        $monitor->save();

        $run = MonitorRun::query()
            ->where('monitor_id', $monitor->id)
            ->whereIn('status', ['queued', 'running'])
            ->whereNull('finished_at')
            ->latest('id')
            ->first();

        if (! $run) {
            $run = MonitorRun::query()->create([
                'monitor_id' => $monitor->id,
                'started_at' => now(),
                'status' => 'queued',
                'attempt' => 1,
            ]);
        }

        CheckMonitorPriceJob::dispatch($monitor->id, 'moderation-approval', $run->id);
    }
}
