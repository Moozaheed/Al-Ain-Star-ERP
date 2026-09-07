<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Pagination\LengthAwarePaginator;

class ApiResponse
{
    /**
     * Success envelope.
     */
    public static function success(mixed $data, ?string $message = null, int $code = 200): JsonResponse
    {
        $payload = [
            'success' => true,
            'message' => $message,
            'data' => $data instanceof JsonResource ? $data->resolve() : $data,
        ];

        return response()->json($payload, $code);
    }

    /**
     * Error envelope.
     *
     * @param  array<string, mixed>  $errors
     */
    public static function error(string $message, int $code = 400, array $errors = []): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => (object) $errors,
        ], $code);
    }

    /**
     * Paginated resource envelope.
     *
     * @param  class-string<JsonResource>  $resourceClass
     */
    public static function paginated(LengthAwarePaginator $paginator, string $resourceClass): JsonResponse
    {
        $collection = $resourceClass::collection($paginator);

        return self::paginatedEnvelope($paginator, $collection->resolve());
    }

    /**
     * Paginated envelope for a paginator whose rows were already hand-built
     * (e.g. via $paginator->through(...)) rather than passed through a
     * JsonResource. Keeps the same data/meta/links shape as paginated() so
     * every list endpoint returns an identically-shaped response.
     */
    public static function paginatedRaw(LengthAwarePaginator $paginator): JsonResponse
    {
        return self::paginatedEnvelope($paginator, array_values($paginator->items()));
    }

    /**
     * @param  array<int, mixed>  $data
     */
    private static function paginatedEnvelope(LengthAwarePaginator $paginator, array $data): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => null,
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
        ]);
    }
}
