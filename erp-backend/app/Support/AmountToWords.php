<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Spells out an AED amount the way the old system's printouts did, e.g.
 * "Dhs: FIVE THOUSAND FIVE HUNDRED TWELVE AND FILS 50/100 ONLY" for 5512.50.
 */
class AmountToWords
{
    private const ONES = [
        '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
        'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
        'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
    ];

    private const TENS = [
        '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY',
    ];

    public static function aed(float $amount): string
    {
        $fils   = (int) round(($amount - floor($amount)) * 100);
        $dirham = (int) floor($amount);

        $words = self::spellInteger($dirham);
        $suffix = $fils > 0
            ? "AND FILS {$fils}/100 ONLY"
            : 'ONLY';

        return "Dhs: {$words} {$suffix}";
    }

    private static function spellInteger(int $number): string
    {
        if ($number === 0) {
            return 'ZERO';
        }

        $parts = [];

        foreach ([
            1_000_000_000 => 'BILLION',
            1_000_000 => 'MILLION',
            1_000 => 'THOUSAND',
        ] as $value => $label) {
            if ($number >= $value) {
                $chunk = intdiv($number, $value);
                $parts[] = self::spellUnderThousand($chunk).' '.$label;
                $number %= $value;
            }
        }

        if ($number > 0) {
            $parts[] = self::spellUnderThousand($number);
        }

        return trim(implode(' ', $parts));
    }

    private static function spellUnderThousand(int $number): string
    {
        $words = '';

        if ($number >= 100) {
            $words .= self::ONES[intdiv($number, 100)].' HUNDRED ';
            $number %= 100;
        }

        if ($number >= 20) {
            $words .= self::TENS[intdiv($number, 10)].' ';
            $number %= 10;
        }

        if ($number > 0) {
            $words .= self::ONES[$number].' ';
        }

        return trim($words);
    }
}
