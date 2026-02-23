<?php

namespace Packages\Bookmarklet\Http\Controllers;

use App\Http\Controllers\Controller;
use Packages\Bookmarklet\Services\BookmarkletSessionService;
use Packages\PriceExtraction\Services\PriceExtractionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;

class BookmarkletCaptureController extends Controller
{
    public function __construct(
        private readonly BookmarkletSessionService $bookmarkletSessionService,
        private readonly PriceExtractionService $priceExtractionService,
    ) {}

    public function capture(Request $request): JsonResponse|Response
    {
        $payload = $this->normalizePayload($request);

        $validator = Validator::make($payload, [
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
            return $this->errorResponse($request, 'Invalid selector payload.', 422);
        }

        $validated = $validator->validated();

        $session = $this->bookmarkletSessionService->resolveValidToken($validated['token']);
        if (! $session) {
            return $this->errorResponse($request, 'Selector token is invalid or expired.', 401);
        }

        $monitor = $session->monitor()->with('site', 'monster')->firstOrFail();

        $selectorConfig = [
            'price' => $this->normalizeSelector($validated['selectors']['price'] ?? []),
            'shipping' => $this->normalizeSelector($validated['selectors']['shipping'] ?? []),
            'quantity' => $this->normalizeSelector($validated['selectors']['quantity'] ?? []),
        ];

        $monitor->selector_config = $selectorConfig;
        $monitor->product_url = $validated['page_url'];
        $monitor->save();

        $result = $this->priceExtractionService->extract($monitor, allowHeadlessFallback: false);

        if ($result->status === 'failed') {
            return $this->errorResponse(
                request: $request,
                message: 'Selector capture saved, but validation failed. Please retry with a better price selector.',
                status: 422,
            );
        }

        $this->bookmarkletSessionService->markUsed($session);

        if ($request->expectsJson()) {
            return response()->json([
                'ok' => true,
                'message' => 'Selectors captured and validated.',
                'status' => $result->status,
                'currency' => $result->currency,
                'price_cents' => $result->priceCents,
                'shipping_cents' => $result->shippingCents,
                'can_count' => $result->canCount,
                'price_per_can_cents' => $result->pricePerCanCents,
            ]);
        }

        return response(
            view('bookmarklet-capture-result', [
                'ok' => true,
                'message' => 'Selectors captured and validated successfully. You can close this tab.',
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

    private function errorResponse(Request $request, string $message, int $status): JsonResponse|Response
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
            ]),
            $status,
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
