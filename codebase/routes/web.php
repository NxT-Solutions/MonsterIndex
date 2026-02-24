<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Packages\Admin\Http\Controllers\AlertController as AdminAlertController;
use Packages\Admin\Http\Controllers\BookmarkletController as AdminBookmarkletController;
use Packages\Admin\Http\Controllers\DashboardController as AdminDashboardController;
use Packages\Admin\Http\Controllers\MonitorController as AdminMonitorController;
use Packages\Admin\Http\Controllers\MonitorReviewController as AdminMonitorReviewController;
use Packages\Admin\Http\Controllers\MonsterController as AdminMonsterController;
use Packages\Admin\Http\Controllers\MonsterSuggestionReviewController as AdminMonsterSuggestionReviewController;
use Packages\Admin\Http\Controllers\PushTestController as AdminPushTestController;
use Packages\Admin\Http\Controllers\SiteController as AdminSiteController;
use Packages\Contributions\Http\Controllers\MonitorContributionController;
use Packages\Contributions\Http\Controllers\ContributorAlertController;
use Packages\Contributions\Http\Controllers\FollowedMonsterController;
use Packages\Contributions\Http\Controllers\MonsterFollowController;
use Packages\Contributions\Http\Controllers\MonsterSuggestionController;
use Packages\Notifications\Http\Controllers\PushSubscriptionController;
use Packages\PublicBoard\Http\Controllers\HomeController;
use Packages\PublicBoard\Http\Controllers\MonsterController as PublicMonsterController;
use Packages\PublicBoard\Http\Controllers\SitemapController;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/monsters/{monster:slug}', [PublicMonsterController::class, 'show'])->name('monsters.show');
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap.xml');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::get('/api/push/vapid-public-key', [PushSubscriptionController::class, 'vapidPublicKey'])
        ->name('api.push.vapid-public-key');
    Route::post('/api/push/subscriptions', [PushSubscriptionController::class, 'store'])
        ->middleware('throttle:push-subscribe')
        ->name('api.push.subscriptions.store');
    Route::delete('/api/push/subscriptions', [PushSubscriptionController::class, 'destroy'])
        ->middleware('throttle:push-subscribe')
        ->name('api.push.subscriptions.destroy');

    Route::middleware(['permission:monitor.submit'])->group(function () {
        Route::get('/contribute/monitors', [MonitorContributionController::class, 'index'])
            ->name('contribute.monitors.index');
        Route::post('/contribute/monitors', [MonitorContributionController::class, 'store'])
            ->middleware('throttle:monitor-create')
            ->name('contribute.monitors.store');
        Route::put('/contribute/monitors/{monitor}', [MonitorContributionController::class, 'update'])
            ->middleware('can:update,monitor')
            ->name('contribute.monitors.update');
        Route::delete('/contribute/monitors/{monitor}', [MonitorContributionController::class, 'destroy'])
            ->middleware('can:delete,monitor')
            ->name('contribute.monitors.destroy');
        Route::post('/contribute/monitors/{monitor}/submit', [MonitorContributionController::class, 'submit'])
            ->middleware(['can:submitForReview,monitor', 'throttle:monitor-submit'])
            ->name('contribute.monitors.submit');

        Route::post('/api/bookmarklet/session', [AdminBookmarkletController::class, 'session'])
            ->middleware('throttle:selector-actions')
            ->name('api.bookmarklet.session');
        Route::get('/monitors/{monitor}/selector-browser', [AdminBookmarkletController::class, 'selectorBrowser'])
            ->name('monitors.selector-browser');
        Route::get('/admin/monitors/{monitor}/selector-browser', [AdminBookmarkletController::class, 'selectorBrowser'])
            ->name('admin.monitors.selector-browser');
    });

    Route::middleware(['permission:monster-suggestion.submit'])->group(function () {
        Route::get('/contribute/suggestions', [MonsterSuggestionController::class, 'index'])
            ->name('contribute.suggestions.index');
        Route::post('/contribute/suggestions', [MonsterSuggestionController::class, 'store'])
            ->middleware('throttle:suggestion-create')
            ->name('contribute.suggestions.store');
    });

    Route::middleware(['permission:monster.follow'])->group(function () {
        Route::post('/monsters/{monster:slug}/follow', [MonsterFollowController::class, 'store'])
            ->middleware('throttle:follow-actions')
            ->name('monsters.follow.store');
        Route::delete('/monsters/{monster:slug}/follow', [MonsterFollowController::class, 'destroy'])
            ->middleware('throttle:follow-actions')
            ->name('monsters.follow.destroy');
        Route::get('/contribute/follows', [FollowedMonsterController::class, 'index'])
            ->name('contribute.follows.index');
    });

    Route::middleware(['permission:contributor-alert.view.own'])->group(function () {
        Route::get('/contribute/alerts', [ContributorAlertController::class, 'index'])
            ->name('contribute.alerts.index');
    });

    Route::middleware(['permission:contributor-alert.mark-read.own'])->group(function () {
        Route::post('/contribute/alerts/{alert}/read', [ContributorAlertController::class, 'markRead'])
            ->middleware('throttle:alert-actions')
            ->name('contribute.alerts.mark-read');
        Route::post('/contribute/alerts/read-all', [ContributorAlertController::class, 'markAllRead'])
            ->middleware('throttle:alert-actions')
            ->name('contribute.alerts.mark-all-read');
    });

    Route::middleware(['permission:admin.access'])->group(function () {
        Route::get('/admin', [AdminDashboardController::class, 'index'])->name('admin.dashboard');

        Route::middleware('permission:monsters.manage')->group(function () {
            Route::get('/admin/monsters', [AdminMonsterController::class, 'index'])->name('admin.monsters.index');
            Route::get('/admin/monsters/{monster:slug}', [AdminMonsterController::class, 'show'])->name('admin.monsters.show');
            Route::post('/admin/monsters', [AdminMonsterController::class, 'store'])->name('admin.monsters.store');
            Route::put('/admin/monsters/{monster}', [AdminMonsterController::class, 'update'])->name('admin.monsters.update');
            Route::delete('/admin/monsters/{monster}', [AdminMonsterController::class, 'destroy'])->name('admin.monsters.destroy');
            Route::post('/admin/monsters/{monster}/records', [AdminMonsterController::class, 'storeRecord'])->name('admin.monsters.records.store');
            Route::get('/api/admin/monsters/{monster:slug}/records/events', [AdminMonsterController::class, 'recordsEvents'])->name('api.admin.monsters.records.events');
        });

        Route::middleware('permission:stores.manage')->group(function () {
            Route::get('/admin/stores', [AdminSiteController::class, 'index'])->name('admin.stores.index');
            Route::post('/admin/stores', [AdminSiteController::class, 'store'])->name('admin.stores.store');
            Route::put('/admin/stores/{site}', [AdminSiteController::class, 'update'])->name('admin.stores.update');
            Route::delete('/admin/stores/{site}', [AdminSiteController::class, 'destroy'])->name('admin.stores.destroy');
        });

        Route::middleware('permission:monitors.manage.any')->group(function () {
            Route::get('/admin/monitors', [AdminMonitorController::class, 'index'])->name('admin.monitors.index');
            Route::post('/admin/monitors', [AdminMonitorController::class, 'store'])->name('admin.monitors.store');
            Route::put('/admin/monitors/{monitor}', [AdminMonitorController::class, 'update'])->name('admin.monitors.update');
            Route::delete('/admin/monitors/{monitor}', [AdminMonitorController::class, 'destroy'])->name('admin.monitors.destroy');
            Route::post('/api/admin/monitors/{monitor}/run-now', [AdminMonitorController::class, 'runNow'])->name('api.admin.monitors.run-now');
        });

        Route::middleware('permission:monitor.approve')->group(function () {
            Route::get('/admin/review/monitors', [AdminMonitorReviewController::class, 'index'])->name('admin.review.monitors.index');
            Route::post('/admin/review/monitors/{monitor}/approve', [AdminMonitorReviewController::class, 'approve'])->name('admin.review.monitors.approve');
        });
        Route::middleware('permission:monitor.force-approve')->group(function () {
            Route::post('/admin/review/monitors/{monitor}/force-approve', [AdminMonitorReviewController::class, 'forceApprove'])->name('admin.review.monitors.force-approve');
        });
        Route::middleware('permission:monitor.reject')->group(function () {
            Route::post('/admin/review/monitors/{monitor}/reject', [AdminMonitorReviewController::class, 'reject'])->name('admin.review.monitors.reject');
        });

        Route::middleware('permission:monster-suggestion.review')->group(function () {
            Route::get('/admin/review/suggestions', [AdminMonsterSuggestionReviewController::class, 'index'])->name('admin.review.suggestions.index');
            Route::post('/admin/review/suggestions/{suggestion}/approve', [AdminMonsterSuggestionReviewController::class, 'approve'])->name('admin.review.suggestions.approve');
            Route::post('/admin/review/suggestions/{suggestion}/reject', [AdminMonsterSuggestionReviewController::class, 'reject'])->name('admin.review.suggestions.reject');
        });

        Route::get('/admin/alerts', [AdminAlertController::class, 'index'])->name('admin.alerts.index');
        Route::post('/admin/alerts/{alert}/read', [AdminAlertController::class, 'markRead'])->name('admin.alerts.mark-read');
        Route::middleware('permission:push.test')->group(function () {
            Route::post('/api/admin/push/test', [AdminPushTestController::class, 'send'])
                ->middleware('throttle:push-test')
                ->name('api.admin.push.test');
        });
    });
});

Route::get('/bookmarklet/selector.js', [AdminBookmarkletController::class, 'script'])->name('bookmarklet.script');

require __DIR__.'/auth.php';
