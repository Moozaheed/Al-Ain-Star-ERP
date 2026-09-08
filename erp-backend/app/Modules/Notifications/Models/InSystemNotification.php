<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Models;

use App\Modules\Admin\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InSystemNotification extends Model
{
    const UPDATED_AT = null;

    protected $fillable = ['user_id', 'event_type', 'title', 'body', 'link', 'is_read', 'read_at'];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
