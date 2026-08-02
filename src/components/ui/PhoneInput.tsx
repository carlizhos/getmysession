import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Check, Phone } from 'lucide-react';

export interface CountryCode {
  code: string;       // ISO country code (e.g., 'MX')
  dialCode: string;   // Dial code (e.g., '+52')
  flag: string;       // Flag emoji
  name: string;       // Country name
  expectedDigits: number; // Local phone digit length
}

// 1º México (Default), 2º Estados Unidos, luego orden alfabético por nombre
export const COUNTRY_CODES: CountryCode[] = [
  { code: 'MX', dialCode: '+52', flag: '🇲🇽', name: 'México', expectedDigits: 10 },
  { code: 'US', dialCode: '+1', flag: '🇺🇸', name: 'Estados Unidos', expectedDigits: 10 },
  { code: 'AR', dialCode: '+54', flag: '🇦🇷', name: 'Argentina', expectedDigits: 10 },
  { code: 'BO', dialCode: '+591', flag: '🇧🇴', name: 'Bolivia', expectedDigits: 8 },
  { code: 'CA', dialCode: '+1', flag: '🇨🇦', name: 'Canadá', expectedDigits: 10 },
  { code: 'CL', dialCode: '+56', flag: '🇨🇱', name: 'Chile', expectedDigits: 9 },
  { code: 'CO', dialCode: '+57', flag: '🇨🇴', name: 'Colombia', expectedDigits: 10 },
  { code: 'CR', dialCode: '+506', flag: '🇨🇷', name: 'Costa Rica', expectedDigits: 8 },
  { code: 'EC', dialCode: '+593', flag: '🇪🇨', name: 'Ecuador', expectedDigits: 9 },
  { code: 'SV', dialCode: '+503', flag: '🇸🇻', name: 'El Salvador', expectedDigits: 8 },
  { code: 'ES', dialCode: '+34', flag: '🇪🇸', name: 'España', expectedDigits: 9 },
  { code: 'GT', dialCode: '+502', flag: '🇬🇹', name: 'Guatemala', expectedDigits: 8 },
  { code: 'HN', dialCode: '+504', flag: '🇭🇳', name: 'Honduras', expectedDigits: 8 },
  { code: 'PA', dialCode: '+507', flag: '🇵🇦', name: 'Panamá', expectedDigits: 8 },
  { code: 'PE', dialCode: '+51', flag: '🇵🇪', name: 'Perú', expectedDigits: 9 },
  { code: 'PR', dialCode: '+1', flag: '🇵🇷', name: 'Puerto Rico', expectedDigits: 10 },
  { code: 'DO', dialCode: '+1', flag: '🇩🇴', name: 'Rep. Dominicana', expectedDigits: 10 },
  { code: 'UY', dialCode: '+598', flag: '🇺🇾', name: 'Uruguay', expectedDigits: 8 },
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
      const local = cleaned.slice(country.dialCode.length).slice(0, country.expectedDigits);
      return { dialCode: country.dialCode, localDigits: local };
    }
    // Also check without plus sign (e.g., 525512345678)
    const dialNoPlus = country.dialCode.replace('+', '');
    if (cleaned.startsWith(dialNoPlus) && cleaned.length >= dialNoPlus.length + 7) {
      const local = cleaned.slice(dialNoPlus.length).slice(0, country.expectedDigits);
      return { dialCode: country.dialCode, localDigits: local };
    }
  }

  // Fallback: assume 10 digits are local Mexican number
  const justDigits = cleaned.replace(/\D/g, '').slice(-10);
  return { dialCode: '+52', localDigits: justDigits };
}

// Format digits nicely on display (e.g., "55 1234 5678" or "612 345 678")
export function formatLocalDisplay(digits: string): string {
  const clean = digits.replace(/\D/g, '');
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 2)} ${clean.slice(2)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
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

  const selectedCountry = COUNTRY_CODES.find(c => c.dialCode === selectedDialCode) || COUNTRY_CODES[0];

  const handleCountryChange = (newDialCode: string) => {
    setSelectedDialCode(newDialCode);
    const newCountry = COUNTRY_CODES.find(c => c.dialCode === newDialCode) || COUNTRY_CODES[0];
    const trimmedLocal = localDigits.slice(0, newCountry.expectedDigits);
    setLocalDigits(trimmedLocal);
    const fullNumber = trimmedLocal.length > 0 ? `${newDialCode}${trimmedLocal}` : '';
    if (onChange) {
      onChange(fullNumber, trimmedLocal, newDialCode);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, selectedCountry.expectedDigits);
    setLocalDigits(raw);
    const fullNumber = raw.length > 0 ? `${selectedDialCode}${raw}` : '';
    if (onChange) {
      onChange(fullNumber, raw, selectedDialCode);
    }
  };

  const isComplete = localDigits.length === selectedCountry.expectedDigits;

  return (
    <div className={cn('flex items-center gap-2.5 w-full', className)}>
      {/* Recuadro 1: Selector de País (Ancho fijo perfecto) */}
      <Select value={selectedDialCode} onValueChange={handleCountryChange} disabled={disabled}>
        <SelectTrigger className="w-[125px] sm:w-[135px] h-11 shrink-0 bg-card border-border hover:bg-muted/40 font-semibold rounded-xl text-xs shadow-2xs transition-all focus:ring-2 focus:ring-primary/20">
          <SelectValue>
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-lg leading-none shrink-0">{selectedCountry.flag}</span>
              <span className="font-mono text-xs font-bold text-foreground">{selectedCountry.dialCode}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-64 z-[100] rounded-xl shadow-xl">
          {COUNTRY_CODES.map(country => (
            <SelectItem key={`${country.code}-${country.dialCode}`} value={country.dialCode} className="py-2.5 cursor-pointer">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="text-lg">{country.flag}</span>
                <span className="font-bold">{country.name}</span>
                <span className="text-muted-foreground ml-auto font-mono text-[11px] font-semibold">{country.dialCode}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Recuadro 2: Captura de Lada / Área y Número (Flexible & Amplio) */}
      <div
        className={cn(
          "relative flex-1 flex items-center h-11 rounded-xl border border-input bg-card px-3 gap-2 transition-all shadow-2xs",
          "focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary",
          error && "border-red-500 focus-within:ring-red-500/20 focus-within:border-red-500",
          isComplete && "border-emerald-500/60 bg-emerald-500/5",
          disabled && "opacity-60 cursor-not-allowed bg-muted/30"
        )}
      >
        <Phone className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        <input
          id={id}
          type="tel"
          disabled={disabled}
          value={formatLocalDisplay(localDigits)}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-xs sm:text-sm font-mono font-bold tracking-wide outline-none placeholder:text-muted-foreground/35 placeholder:font-sans text-foreground"
        />
        <div className="shrink-0 flex items-center pl-1">
          {isComplete ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span className="hidden sm:inline">Válido</span>
            </span>
          ) : (
            <span className={cn(
              'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-muted/60',
              localDigits.length > 0 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/15' : 'text-muted-foreground/40'
            )}>
              {localDigits.length}/{selectedCountry.expectedDigits}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
