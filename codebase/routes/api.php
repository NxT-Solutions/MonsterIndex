<?php

use Illuminate\Support\Facades\Route;
use Packages\Bookmarklet\Http\Controllers\BookmarkletCaptureController;
use Packages\PublicBoard\Http\Controllers\PublicBestPriceController;

Route::get('/public/best-prices', [PublicBestPriceController::class, 'index'])
    ->name('api.public.best-prices');

Route::match(['GET', 'POST'], '/bookmarklet/capture', [BookmarkletCaptureController::class, 'capture'])
    ->middleware('throttle:bookmarklet-capture')
    ->name('api.bookmarklet.capture');
