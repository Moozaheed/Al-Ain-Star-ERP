<?php

declare(strict_types=1);

namespace App\Enums;

enum JournalSourceType: string
{
    case Invoice = 'invoice';
    case Purchase = 'purchase';
    case Payment = 'payment';
    case Transfer = 'transfer';
    case Return_ = 'return';
    case Expense = 'expense';
    case Manual = 'manual';
    case Reversal = 'reversal';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }
}
