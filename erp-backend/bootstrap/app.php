<?php

declare(strict_types=1);

use App\Support\ApiResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Service-layer validation failures (e.g. "invoice would exceed credit
        // limit") were falling through to Laravel's default handler, which has
        // no HttpExceptionInterface mapping for InvalidArgumentException and so
        // renders it as a raw 500 with a debug stack trace — not a usable API
        // error a frontend can branch on.
        $exceptions->render(function (InvalidArgumentException $e, Request $request) {
            if ($request->expectsJson()) {
                return ApiResponse::error($e->getMessage(), 422);
            }
        });
    })->create();
