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
            'selectors.shipping.css' => ['nullable', 'string', 'max:2000'],
            'selectors.shipping.xpath' => ['nullable', 'string', 'max:2000'],
            'selectors.shipping.sample_text' => ['nullable', 'string', 'max:1000'],
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
            'price' => $validated['selectors']['price'] ?? [],
            'shipping' => $validated['selectors']['shipping'] ?? [],
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
}
