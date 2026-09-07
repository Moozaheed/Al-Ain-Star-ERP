<?php
declare(strict_types=1);
namespace App\Modules\Hr\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeDocument extends Model
{
    protected $fillable = [
        'employee_id', 'doc_type', 'document_number',
        'issue_date', 'expiry_date', 'file_path', 'is_active', 'uploaded_by',
    ];

    protected $casts = [
        'issue_date'  => 'date',
        'expiry_date' => 'date',
        'is_active'   => 'boolean',
    ];

    public function employee(): BelongsTo { return $this->belongsTo(Employee::class); }

    public function getExpiryStatusAttribute(): string
    {
        $days = now()->diffInDays($this->expiry_date, false);
        if ($days < 0)  return 'expired';
        if ($days <= 30) return 'expiring_soon';
        return 'valid';
    }

    public function getDaysUntilExpiryAttribute(): int
    {
        return (int) now()->diffInDays($this->expiry_date, false);
    }
}
