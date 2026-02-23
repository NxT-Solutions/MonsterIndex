<?php

use Packages\Bookmarklet\Http\Controllers\BookmarkletCaptureController;
use Packages\PublicBoard\Http\Controllers\PublicBestPriceController;
use Illuminate\Support\Facades\Route;

Route::get('/public/best-prices', [PublicBestPriceController::class, 'index'])
    ->name('api.public.best-prices');

Route::match(['GET', 'POST'], '/bookmarklet/capture', [BookmarkletCaptureController::class, 'capture'])
    ->name('api.bookmarklet.capture');
