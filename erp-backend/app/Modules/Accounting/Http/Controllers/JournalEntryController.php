<?php

declare(strict_types=1);

namespace App\Modules\Accounting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accounting\Http\Requests\JournalEntryRequest;
use App\Modules\Accounting\Http\Resources\JournalEntryResource;
use App\Modules\Accounting\Services\JournalService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class JournalEntryController extends Controller
{
    public function __construct(private readonly JournalService $journals) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 25);

        $paginator = $this->journals->query()
            ->with('lines')
            ->orderByDesc('id')
            ->paginate($perPage);

        return ApiResponse::paginated($paginator, JournalEntryResource::class);
    }

    public function store(JournalEntryRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $payload['posted_by'] = (int) $request->user()?->getAuthIdentifier();

        try {
            $entry = $this->journals->post($payload);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        $entry->load('lines');

        return ApiResponse::success(new JournalEntryResource($entry), 'Journal entry posted.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $entry = $this->journals->query()->with('lines')->find($id);

        if ($entry === null) {
            return ApiResponse::error('Journal entry not found.', 404);
        }

        return ApiResponse::success(new JournalEntryResource($entry));
    }
}
