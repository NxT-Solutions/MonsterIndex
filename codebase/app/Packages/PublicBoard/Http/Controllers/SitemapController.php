<?php

namespace Packages\PublicBoard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monster;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $urls = collect([
            route('home'),
        ])->merge(
            Monster::query()
                ->where('active', true)
                ->orderBy('id')
                ->pluck('slug')
                ->map(fn (string $slug): string => route('monsters.show', $slug)),
        )->values();

        $xml = view('sitemap', [
            'urls' => $urls,
        ])->render();

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
        ]);
    }
}
