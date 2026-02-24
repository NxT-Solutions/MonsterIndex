<?php

namespace Packages\Bookmarklet\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Models\PriceSnapshot;
use App\Support\UrlCanonicalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Packages\Bookmarklet\Services\BookmarkletSessionService;
use Packages\Monitoring\Services\BestPriceProjector;
use Packages\PriceExtraction\Services\PriceExtractionService;

class BookmarkletCaptureController extends Controller
{
    public function __construct(
        private readonly BookmarkletSessionService $bookmarkletSessionService,
        private readonly PriceExtractionService $priceExtractionService,
        private readonly BestPriceProjector $bestPriceProjector,
    ) {}

    public function capture(Request $request): JsonResponse|Response
    {
        $payload = $this->normalizePayload($request);
        $lang = $this->resolveLang($request, $payload);

        $validator = Validator::make($payload, [
            'lang' => ['nullable', 'in:en,nl'],
            'token' => ['required', 'string'],
            'page_url' => ['required', 'url', 'max:2048'],
            'page_title' => ['nullable', 'string', 'max:500'],
            'selectors.price.css' => ['nullable', 'string', 'max:2000'],
            'selectors.price.xpath' => ['nullable', 'string', 'max:2000'],
            'selectors.price.sample_text' => ['nullable', 'string', 'max:1000'],
            'selectors.price.join_with' => ['nullable', 'string', 'max:10'],
            'selectors.price.parts' => ['nullable', 'array', 'max:6'],
            'selectors.price.parts.*.css' => ['nullable', 'string', 'max:2000'],
            'selectors.price.parts.*.xpath' => ['nullable', 'string', 'max:2000'],
            'selectors.price.parts.*.sample_text' => ['nullable', 'string', 'max:1000'],
            'selectors.shipping.css' => ['nullable', 'string', 'max:2000'],
            'selectors.shipping.xpath' => ['nullable', 'string', 'max:2000'],
            'selectors.shipping.sample_text' => ['nullable', 'string', 'max:1000'],
            'selectors.shipping.join_with' => ['nullable', 'string', 'max:10'],
            'selectors.shipping.manual_value' => ['nullable', 'string', 'max:50'],
            'selectors.shipping.parts' => ['nullable', 'array', 'max:6'],
            'selectors.shipping.parts.*.css' => ['nullable', 'string', 'max:2000'],
            'selectors.shipping.parts.*.xpath' => ['nullable', 'string', 'max:2000'],
            'selectors.shipping.parts.*.sample_text' => ['nullable', 'string', 'max:1000'],
            'selectors.quantity.css' => ['nullable', 'string', 'max:2000'],
            'selectors.quantity.xpath' => ['nullable', 'string', 'max:2000'],
            'selectors.quantity.sample_text' => ['nullable', 'string', 'max:1000'],
            'selectors.quantity.join_with' => ['nullable', 'string', 'max:10'],
            'selectors.quantity.manual_value' => ['nullable', 'string', 'max:50'],
            'selectors.quantity.parts' => ['nullable', 'array', 'max:6'],
            'selectors.quantity.parts.*.css' => ['nullable', 'string', 'max:2000'],
            'selectors.quantity.parts.*.xpath' => ['nullable', 'string', 'max:2000'],
            'selectors.quantity.parts.*.sample_text' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return $this->errorResponse(
                $request,
                $this->translate($lang, 'Invalid selector payload.', 'Ongeldige selector-payload.'),
                422,
                $lang,
            );
        }

        $validated = $validator->validated();

        $session = $this->bookmarkletSessionService->resolveValidToken($validated['token']);
        if (! $session) {
            return $this->errorResponse(
                $request,
                $this->translate($lang, 'Selector token is invalid or expired.', 'Selectortoken is ongeldig of verlopen.'),
                401,
                $lang,
            );
        }

        $monitor = $session->monitor()->with('site', 'monster')->firstOrFail();

        $selectorConfig = [
            'price' => $this->normalizeSelector($validated['selectors']['price'] ?? []),
            'shipping' => $this->normalizeSelector($validated['selectors']['shipping'] ?? []),
            'quantity' => $this->normalizeSelector($validated['selectors']['quantity'] ?? []),
        ];

        $monitor->selector_config = $selectorConfig;
        $monitor->product_url = $validated['page_url'];
        $monitor->canonical_product_url = UrlCanonicalizer::canonicalize($validated['page_url']);
        $monitor->validation_status = Monitor::VALIDATION_PENDING;
        $monitor->validation_checked_at = null;
        $monitor->validation_result = null;
        $monitor->save();

        $result = $this->priceExtractionService->extract($monitor, allowHeadlessFallback: false);
        $isValidationSuccess = $result->status !== 'failed';
        $monitorCurrency = (string) ($monitor->currency ?: Monitor::DEFAULT_CURRENCY);

        $monitor->forceFill([
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
                'currency' => $monitorCurrency,
            ],
        ])->save();

        if ($result->status === 'failed') {
            return $this->errorResponse(
                request: $request,
                message: $this->validationFailedMessage($lang, $result->errorCode),
                status: 422,
                lang: $lang,
            );
        }

        if ($monitor->submission_status === Monitor::STATUS_APPROVED) {
            $snapshot = PriceSnapshot::query()->create([
                'monitor_id' => $monitor->id,
                'checked_at' => now(),
                'price_cents' => $result->priceCents,
                'shipping_cents' => $result->shippingCents,
                'effective_total_cents' => $result->effectiveTotalCents,
                'can_count' => $result->canCount,
                'price_per_can_cents' => $result->pricePerCanCents,
                'currency' => $monitorCurrency,
                'availability' => $result->availability,
                'raw_text' => $result->rawText,
                'status' => $result->status,
                'error_code' => $result->errorCode,
            ]);

            $this->bestPriceProjector->projectFromSnapshot($snapshot);
        }

        $this->bookmarkletSessionService->markUsed($session);

        if ($request->expectsJson()) {
            return response()->json([
                'ok' => true,
                'message' => $this->translate(
                    $lang,
                    $monitor->submission_status === Monitor::STATUS_APPROVED
                        ? 'Selectors captured and validated.'
                        : 'Selectors captured and validation stored. Submit this monitor for admin review.',
                    $monitor->submission_status === Monitor::STATUS_APPROVED
                        ? 'Selectors opgeslagen en gevalideerd.'
                        : 'Selectors opgeslagen en validatie bewaard. Dien deze monitor nu in voor adminreview.',
                ),
                'status' => $result->status,
                'currency' => $monitorCurrency,
                'price_cents' => $result->priceCents,
                'shipping_cents' => $result->shippingCents,
                'effective_total_cents' => $result->effectiveTotalCents,
                'can_count' => $result->canCount,
                'price_per_can_cents' => $result->pricePerCanCents,
            ]);
        }

        return response(
            view('bookmarklet-capture-result', [
                'ok' => true,
                'message' => $this->translate(
                    $lang,
                    'Selectors captured and validated successfully. You can close this tab.',
                    'Selectors zijn succesvol opgeslagen en gevalideerd. Je kunt dit tabblad sluiten.',
                ),
            ]),
            200,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizePayload(Request $request): array
    {
        if ($request->isMethod('post')) {
            return $request->all();
        }

        if ($request->query('selectors')) {
            return $request->query();
        }

        return [
            'lang' => $request->query('lang'),
            'token' => $request->query('token'),
            'page_url' => $request->query('page_url'),
            'page_title' => $request->query('page_title'),
            'selectors' => [
                'price' => [
                    'css' => $request->query('price_css'),
                    'xpath' => $request->query('price_xpath'),
                    'sample_text' => $request->query('price_sample'),
                ],
                'shipping' => [
                    'css' => $request->query('shipping_css'),
                    'xpath' => $request->query('shipping_xpath'),
                    'sample_text' => $request->query('shipping_sample'),
                    'manual_value' => $request->query('shipping_manual'),
                ],
                'quantity' => [
                    'css' => $request->query('quantity_css'),
                    'xpath' => $request->query('quantity_xpath'),
                    'sample_text' => $request->query('quantity_sample'),
                    'manual_value' => $request->query('quantity_manual'),
                ],
            ],
        ];
    }

    private function errorResponse(Request $request, string $message, int $status, string $lang = 'en'): JsonResponse|Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'ok' => false,
                'message' => $message,
            ], $status);
        }

        return response(
            view('bookmarklet-capture-result', [
                'ok' => false,
                'message' => $message,
                'lang' => $lang,
            ]),
            $status,
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveLang(Request $request, array $payload): string
    {
        $candidate = $payload['lang'] ?? $request->query('lang');

        return $candidate === 'nl' ? 'nl' : 'en';
    }

    private function translate(string $lang, string $english, string $dutch): string
    {
        return $lang === 'nl' ? $dutch : $english;
    }

    private function validationFailedMessage(string $lang, ?string $errorCode): string
    {
        $code = is_string($errorCode) && $errorCode !== ''
            ? $errorCode
            : 'UNKNOWN';

        return $this->translate(
            $lang,
            sprintf(
                'Selector capture saved, but validation failed (%s). This is usually a selector mismatch. Select the exact price text and retry.',
                $code,
            ),
            sprintf(
                'Selectoropslag is bewaard, maar validatie faalde (%s). Dit is meestal een selector-mismatch. Selecteer exact de prijstekst en probeer opnieuw.',
                $code,
            ),
        );
    }

    /**
     * @param  array<string, mixed>  $selector
     * @return array<string, mixed>
     */
    private function normalizeSelector(array $selector): array
    {
        $normalized = [];

        if (isset($selector['css']) && is_string($selector['css'])) {
            $normalized['css'] = trim($selector['css']);
        }

        if (isset($selector['xpath']) && is_string($selector['xpath'])) {
            $normalized['xpath'] = trim($selector['xpath']);
        }

        if (isset($selector['sample_text']) && is_string($selector['sample_text'])) {
            $normalized['sample_text'] = trim($selector['sample_text']);
        }

        if (isset($selector['join_with']) && is_string($selector['join_with'])) {
            $normalized['join_with'] = $selector['join_with'];
        }

        if (isset($selector['manual_value']) && is_string($selector['manual_value'])) {
            $manualValue = trim($selector['manual_value']);
            if ($manualValue !== '') {
                $normalized['manual_value'] = $manualValue;
            }
        }

        $parts = $selector['parts'] ?? null;
        if (is_array($parts)) {
            $normalizedParts = collect($parts)
                ->filter(fn ($part): bool => is_array($part))
                ->map(function (array $part): array {
                    return [
                        'css' => is_string($part['css'] ?? null) ? trim($part['css']) : null,
                        'xpath' => is_string($part['xpath'] ?? null) ? trim($part['xpath']) : null,
                        'sample_text' => is_string($part['sample_text'] ?? null) ? trim($part['sample_text']) : null,
                    ];
                })
                ->filter(function (array $part): bool {
                    return ($part['css'] ?? '') !== '' || ($part['xpath'] ?? '') !== '';
                })
                ->values()
                ->all();

            if ($normalizedParts !== []) {
                $normalized['parts'] = $normalizedParts;

                // Keep single-selector keys for compatibility with existing tooling.
                $first = $normalizedParts[0];
                $normalized['css'] = $normalized['css'] ?? ($first['css'] ?? null);
                $normalized['xpath'] = $normalized['xpath'] ?? ($first['xpath'] ?? null);
                $normalized['sample_text'] = $normalized['sample_text'] ?? ($first['sample_text'] ?? null);
            }
        }

        return $normalized;
    }
}
