import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CountryCode {
  code: string;       // ISO country code (e.g., 'MX')
  dialCode: string;   // Dial code (e.g., '+52')
  flag: string;       // Flag emoji
  name: string;       // Country name
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'MX', dialCode: '+52', flag: '🇲🇽', name: 'México' },
  { code: 'US', dialCode: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: 'CA', dialCode: '+1', flag: '🇨🇦', name: 'Canadá' },
  { code: 'ES', dialCode: '+34', flag: '🇪🇸', name: 'España' },
  { code: 'CO', dialCode: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: 'AR', dialCode: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: 'CL', dialCode: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: 'PE', dialCode: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: 'EC', dialCode: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: 'GT', dialCode: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: 'CR', dialCode: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: 'PA', dialCode: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: 'UY', dialCode: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: 'DO', dialCode: '+1', flag: '🇩🇴', name: 'Rep. Dominicana' },
  { code: 'SV', dialCode: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: 'HN', dialCode: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: 'BO', dialCode: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: 'PR', dialCode: '+1', flag: '🇵🇷', name: 'Puerto Rico' },
];

export interface PhoneInputProps {
  value?: string;
  onChange?: (fullFormattedNumber: string, rawLocalDigits: string, countryCode: string) => void;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
}

// Utility to parse raw stored phone string into { dialCode, localDigits }
export function parsePhoneNumber(rawPhone?: string): { dialCode: string; localDigits: string } {
  if (!rawPhone) return { dialCode: '+52', localDigits: '' };
  
  const cleaned = rawPhone.replace(/[^\d+]/g, '');
  
  // Try matching known dial codes sorted by length descending (+593, +502, +52, +1)
  const sortedCountries = [...COUNTRY_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  
  for (const country of sortedCountries) {
    if (cleaned.startsWith(country.dialCode)) {
      const local = cleaned.slice(country.dialCode.length).slice(0, 10);
      return { dialCode: country.dialCode, localDigits: local };
    }
    // Also check without plus sign (e.g., 525512345678)
    const dialNoPlus = country.dialCode.replace('+', '');
    if (cleaned.startsWith(dialNoPlus) && cleaned.length >= dialNoPlus.length + 10) {
      const local = cleaned.slice(dialNoPlus.length).slice(0, 10);
      return { dialCode: country.dialCode, localDigits: local };
    }
  }

  // Fallback: assume 10 digits are local Mexican number
  const justDigits = cleaned.replace(/\D/g, '').slice(-10);
  return { dialCode: '+52', localDigits: justDigits };
}

// Format 10 digits nicely on display as "55 1234 5678"
export function formatLocalDisplay(digits: string): string {
  const clean = digits.replace(/\D/g, '').slice(0, 10);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 2)} ${clean.slice(2)}`;
  return `${clean.slice(0, 2)} ${clean.slice(2, 6)} ${clean.slice(6, 10)}`;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value = '',
  onChange,
  error = false,
  disabled = false,
  className,
  id,
  placeholder = '55 1234 5678',
}) => {
  const [selectedDialCode, setSelectedDialCode] = useState<string>('+52');
  const [localDigits, setLocalDigits] = useState<string>('');

  // Sync internal state when external value changes
  useEffect(() => {
    const { dialCode, localDigits: parsedLocal } = parsePhoneNumber(value);
    setSelectedDialCode(dialCode);
    setLocalDigits(parsedLocal);
  }, [value]);

  const handleCountryChange = (newDialCode: string) => {
    setSelectedDialCode(newDialCode);
    const fullNumber = localDigits.length > 0 ? `${newDialCode}${localDigits}` : '';
    if (onChange) {
      onChange(fullNumber, localDigits, newDialCode);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setLocalDigits(raw);
    const fullNumber = raw.length > 0 ? `${selectedDialCode}${raw}` : '';
    if (onChange) {
      onChange(fullNumber, raw, selectedDialCode);
    }
  };

  const selectedCountry = COUNTRY_CODES.find(c => c.dialCode === selectedDialCode) || COUNTRY_CODES[0];
  const isComplete = localDigits.length === 10;

  return (
    <div className={cn('flex items-center gap-2 w-full', className)}>
      {/* Country Code Selector */}
      <Select
        value={selectedDialCode}
        onValueChange={handleCountryChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[110px] shrink-0 font-medium bg-muted/30 border-border focus:ring-1 focus:ring-primary">
          <SelectValue>
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-base">{selectedCountry.flag}</span>
              <span>{selectedCountry.dialCode}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {COUNTRY_CODES.map(country => (
            <SelectItem key={`${country.code}-${country.dialCode}`} value={country.dialCode}>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-base">{country.flag}</span>
                <span className="font-semibold">{country.name}</span>
                <span className="text-muted-foreground ml-auto font-mono">{country.dialCode}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 10-Digit Input Field */}
      <div className="relative flex-1">
        <Input
          id={id}
          type="tel"
          disabled={disabled}
          value={formatLocalDisplay(localDigits)}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn(
            'font-mono tracking-wide pr-10 text-sm font-semibold',
            error && 'border-red-500 focus-visible:ring-red-500',
            isComplete && 'border-emerald-500/50 bg-emerald-500/5'
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {isComplete ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            </span>
          ) : (
            <span className={cn(
              'text-[10px] font-mono font-medium',
              localDigits.length > 0 ? 'text-amber-500 font-bold' : 'text-muted-foreground/40'
            )}>
              {localDigits.length}/10
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
