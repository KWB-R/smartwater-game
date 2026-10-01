import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Bedingte Klassen (clsx) + Tailwind-Konflikt-Auflösung (tailwind-merge):
 * bei konkurrierenden Utilities gewinnt die zuletzt genannte Klasse.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
