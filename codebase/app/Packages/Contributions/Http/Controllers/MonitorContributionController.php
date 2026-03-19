<?php

namespace Packages\Contributions\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\Site;
use App\Support\UrlCanonicalizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Packages\Monitoring\Services\BestPriceProjector;
use Packages\PriceExtraction\Services\PriceExtractionService;

class MonitorContributionController extends Controller
{
    private const CONTRIBUTOR_INTERVAL_MINUTES = 60;

    public function __construct(
        private readonly PriceExtractionService $priceExtractionService,
        private readonly BestPriceProjector $bestPriceProjector,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $monitors = Monitor::query()
            ->where('created_by_user_id', $user->id)
            ->with(['monster:id,name,slug,size_label', 'site:id,name,domain', 'latestSnapshot'])
            ->latest('id')
            ->get();

        return Inertia::render('Contribute/Monitors/Index', [
            'monitors' => $monitors,
            'monsters' => Monster::query()
                ->where('active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'size_label']),
            'sites' => Site::query()
                ->where('active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'domain']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Monitor::class);
        $user = $request->user();
        abort_unless($user !== null, 401);

        $validated = $request->validate([
            'monster_id' => ['required', 'integer', Rule::exists('monsters', 'id')],
            'site_id' => ['nullable', 'integer', Rule::exists('sites', 'id')],
            'create_site' => ['sometimes', 'boolean'],
            'site_name' => ['nullable', 'string', 'max:255'],
            'product_url' => ['required', 'url', 'max:2048'],
        ]);

        $siteId = $this->resolveStoreId($validated);
        $canonicalProductUrl = UrlCanonicalizer::canonicalize($validated['product_url']);
        if (! $canonicalProductUrl) {
            throw ValidationException::withMessages([
                'product_url' => __('Could not normalize the product URL.'),
            ]);
        }

        $this->ensureNoDuplicate(
            monsterId: (int) $validated['monster_id'],
            canonicalProductUrl: $canonicalProductUrl,
            userId: (int) $user->id,
        );

        Monitor::query()->create([
            'monster_id' => (int) $validated['monster_id'],
            'site_id' => $siteId,
            'created_by_user_id' => (int) $user->id,
            'product_url' => $validated['product_url'],
            'canonical_product_url' => $canonicalProductUrl,
            'selector_config' => null,
            'currency' => Monitor::DEFAULT_CURRENCY,
            'check_interval_minutes' => self::CONTRIBUTOR_INTERVAL_MINUTES,
            'next_check_at' => null,
            'active' => false,
            'submission_status' => Monitor::STATUS_DRAFT,
            'validation_status' => Monitor::VALIDATION_PENDING,
            'validation_checked_at' => null,
            'validation_result' => null,
        ]);

        return back()->with('success', __('Monitor proposal created as draft. Configure selectors and submit for review.'));
    }

    public function update(Request $request, Monitor $monitor): RedirectResponse
    {
        $this->authorize('update', $monitor);
        $wasPubliclyVisible = $monitor->canRunScheduledChecks();
        $oldMonsterId = (int) $monitor->monster_id;
        $oldCurrency = (string) $monitor->currency;

        $validated = $request->validate([
            'monster_id' => ['required', 'integer', Rule::exists('monsters', 'id')],
            'site_id' => ['nullable', 'integer', Rule::exists('sites', 'id')],
            'create_site' => ['sometimes', 'boolean'],
            'site_name' => ['nullable', 'string', 'max:255'],
            'product_url' => ['required', 'url', 'max:2048'],
        ]);

        $siteId = $this->resolveStoreId($validated);
        $canonicalProductUrl = UrlCanonicalizer::canonicalize($validated['product_url']);
        if (! $canonicalProductUrl) {
            throw ValidationException::withMessages([
                'product_url' => __('Could not normalize the product URL.'),
            ]);
        }

        $this->ensureNoDuplicate(
            monsterId: (int) $validated['monster_id'],
            canonicalProductUrl: $canonicalProductUrl,
            userId: (int) $monitor->created_by_user_id,
            ignoreMonitorId: (int) $monitor->id,
        );

        $monitor->fill([
            'monster_id' => (int) $validated['monster_id'],
            'site_id' => $siteId,
            'product_url' => $validated['product_url'],
            'canonical_product_url' => $canonicalProductUrl,
            'currency' => Monitor::DEFAULT_CURRENCY,
            'check_interval_minutes' => self::CONTRIBUTOR_INTERVAL_MINUTES,
        ]);

        $coreChanged = $monitor->isDirty([
            'monster_id',
            'site_id',
            'product_url',
            'canonical_product_url',
            'currency',
            'check_interval_minutes',
        ]);

        if ($coreChanged) {
            if ($monitor->submission_status === Monitor::STATUS_APPROVED) {
                $monitor->submission_status = Monitor::STATUS_PENDING_REVIEW;
                $monitor->active = false;
                $monitor->next_check_at = null;
                $monitor->approved_by_user_id = null;
                $monitor->approved_at = null;
            } elseif (in_array($monitor->submission_status, [Monitor::STATUS_REJECTED, Monitor::STATUS_WITHDRAWN], true)) {
                $monitor->submission_status = Monitor::STATUS_DRAFT;
            }

            $monitor->review_note = null;
            $monitor->rejected_by_user_id = null;
            $monitor->rejected_at = null;
            $monitor->validation_status = Monitor::VALIDATION_PENDING;
            $monitor->validation_checked_at = null;
            $monitor->validation_result = null;
        }

        $monitor->save();

        if ($wasPubliclyVisible && ! $monitor->canRunScheduledChecks()) {
            $this->bestPriceProjector->recomputeForMonsterCurrency($oldMonsterId, $oldCurrency);
        }

        return back()->with('success', __('Monitor proposal updated.'));
    }

    public function submit(Request $request, Monitor $monitor): RedirectResponse
    {
        $this->authorize('submitForReview', $monitor);

        if (! $this->hasPriceSelector($monitor)) {
            throw ValidationException::withMessages([
                'monitor' => __('Please configure at least one price selector before submitting.'),
            ]);
        }

        $result = $this->priceExtractionService->extract($monitor, allowHeadlessFallback: false);
        $isValidationSuccess = $result->status !== 'failed';

        $monitor->forceFill([
            'submission_status' => Monitor::STATUS_PENDING_REVIEW,
            'active' => false,
            'next_check_at' => null,
            'review_note' => null,
            'rejected_by_user_id' => null,
            'rejected_at' => null,
            'validation_status' => $isValidationSuccess
                ? Monitor::VALIDATION_SUCCESS
                : Monitor::VALIDATION_FAILED,
            'validation_checked_at' => now(),
            'validation_result' => [
                'status' => $result->status,
                'error_code' => $result->errorCode,
                'price_cents' => $result->priceCents,
                'shipping_cents' => $result->shippingCents,
                'effective_total_cents' => $result->effectiveTotalCents,
                'can_count' => $result->canCount,
                'price_per_can_cents' => $result->pricePerCanCents,
                'currency' => (string) ($monitor->currency ?: Monitor::DEFAULT_CURRENCY),
            ],
        ])->save();

        if ($isValidationSuccess) {
            return back()->with('success', __('Submitted for admin review.'));
        }

        return back()->with('warning', __('Submitted for review with failed validation. Admin can force-approve if needed.'));
    }

    public function destroy(Request $request, Monitor $monitor): RedirectResponse
    {
        $this->authorize('delete', $monitor);

        if ($monitor->submission_status === Monitor::STATUS_APPROVED) {
            $monitor->forceFill([
                'submission_status' => Monitor::STATUS_WITHDRAWN,
                'active' => false,
                'next_check_at' => null,
                'rejected_by_user_id' => $request->user()?->id,
                'rejected_at' => now(),
                'review_note' => __('Withdrawn by owner.'),
            ])->save();

            $this->bestPriceProjector->recomputeForMonsterCurrency(
                (int) $monitor->monster_id,
                (string) $monitor->currency,
            );

            return back()->with('success', __('Monitor withdrawn.'));
        }

        $monitor->delete();

        return back()->with('success', __('Draft monitor removed.'));
    }

    private function hasPriceSelector(Monitor $monitor): bool
    {
        $selectorConfig = $monitor->selector_config;
        if (! is_array($selectorConfig)) {
            return false;
        }

        $price = $selectorConfig['price'] ?? null;
        if (! is_array($price)) {
            return false;
        }

        if (trim((string) ($price['css'] ?? '')) !== '' || trim((string) ($price['xpath'] ?? '')) !== '') {
            return true;
        }

        $parts = $price['parts'] ?? null;
        if (! is_array($parts)) {
            return false;
        }

        foreach ($parts as $part) {
            if (! is_array($part)) {
                continue;
            }

            if (trim((string) ($part['css'] ?? '')) !== '' || trim((string) ($part['xpath'] ?? '')) !== '') {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolveStoreId(array $validated): int
    {
        $domain = $this->extractDomainFromProductUrl((string) $validated['product_url']);
        $customName = trim((string) ($validated['site_name'] ?? ''));

        if (isset($validated['site_id']) && is_int($validated['site_id'])) {
            $selectedSite = Site::query()->find($validated['site_id']);
            if ($selectedSite && $this->normalizeDomain($selectedSite->domain) === $domain) {
                return (int) $selectedSite->id;
            }
        }

        return (int) $this->resolveSiteByDomain($domain, $customName)->id;
    }

    private function guessSiteNameFromDomain(string $domain): string
    {
        $name = str($domain)
            ->replace(['www.', '.com', '.nl', '.eu', '.be', '.de', '.fr', '.co.uk'], '')
            ->headline()
            ->toString();

        return $name !== '' ? $name : $domain;
    }

    private function extractDomainFromProductUrl(string $productUrl): string
    {
        $rawDomain = (string) parse_url($productUrl, PHP_URL_HOST);
        $domain = $this->normalizeDomain($rawDomain);
        if ($domain === '') {
            throw ValidationException::withMessages([
                'product_url' => __('Could not resolve a domain from the provided product URL.'),
            ]);
        }

        return $domain;
    }

    private function normalizeDomain(string $domain): string
    {
        $normalized = strtolower(trim($domain));
        if ($normalized === '') {
            return '';
        }

        return (string) preg_replace('/^www\./', '', $normalized);
    }

    private function resolveSiteByDomain(string $domain, string $customName = ''): Site
    {
        $domainCandidates = collect([
            $domain,
            'www.'.$domain,
        ])->unique()->values();

        $existing = Site::query()
            ->whereIn('domain', $domainCandidates->all())
            ->orderByRaw('case when domain = ? then 0 else 1 end', [$domain])
            ->first();

        if ($existing) {
            if ($customName !== '' && $existing->name !== $customName) {
                $existing->forceFill(['name' => $customName])->save();
            }

            return $existing;
        }

        return Site::query()->create([
            'domain' => $domain,
            'name' => $customName !== '' ? $customName : $this->guessSiteNameFromDomain($domain),
            'active' => true,
        ]);
    }

    private function ensureNoDuplicate(
        int $monsterId,
        string $canonicalProductUrl,
        int $userId,
        ?int $ignoreMonitorId = null,
    ): void {
        $duplicateQuery = Monitor::query()
            ->where('monster_id', $monsterId)
            ->where('currency', Monitor::DEFAULT_CURRENCY)
            ->where('canonical_product_url', $canonicalProductUrl)
            ->whereIn('submission_status', [
                Monitor::STATUS_DRAFT,
                Monitor::STATUS_PENDING_REVIEW,
                Monitor::STATUS_APPROVED,
            ]);

        if ($ignoreMonitorId !== null) {
            $duplicateQuery->where('id', '!=', $ignoreMonitorId);
        }

        if ($duplicateQuery->exists()) {
            throw ValidationException::withMessages([
                'product_url' => __('A monitor proposal for this monster and product URL already exists.'),
            ]);
        }

        $cooldownExists = Monitor::query()
            ->where('created_by_user_id', $userId)
            ->where('monster_id', $monsterId)
            ->where('currency', Monitor::DEFAULT_CURRENCY)
            ->where('canonical_product_url', $canonicalProductUrl)
            ->where('created_at', '>=', now()->subMinutes(10))
            ->when($ignoreMonitorId !== null, fn ($query) => $query->where('id', '!=', $ignoreMonitorId))
            ->exists();

        if ($cooldownExists) {
            throw ValidationException::withMessages([
                'product_url' => __('You already submitted a very similar monitor recently. Please wait before retrying.'),
            ]);
        }
    }
}
