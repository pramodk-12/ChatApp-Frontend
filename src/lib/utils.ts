import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes efficiently using clsx and tailwind-merge.
 * @param inputs - A list of class values, objects, or arrays to be merged.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}