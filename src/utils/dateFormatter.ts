import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';

/**
 * Format a date for display in the UI
 * Shows relative time for recent dates, absolute dates for older ones
 */
export function formatTimestamp(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  if (isToday(dateObj)) {
    return format(dateObj, 'h:mm a');
  }
  
  if (isYesterday(dateObj)) {
    return `Yesterday ${format(dateObj, 'h:mm a')}`;
  }
  
  if (isThisWeek(dateObj)) {
    return format(dateObj, 'EEE h:mm a');
  }
  
  if (isThisYear(dateObj)) {
    return format(dateObj, 'MMM d, h:mm a');
  }
  
  return format(dateObj, 'MMM d, yyyy h:mm a');
}

/**
 * Format time only (for messages)
 */
export function formatTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }
  
  return format(dateObj, 'h:mm a');
}

/**
 * Format date only (no time)
 */
export function formatDate(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  if (isToday(dateObj)) {
    return 'Today';
  }
  
  if (isYesterday(dateObj)) {
    return 'Yesterday';
  }
  
  if (isThisYear(dateObj)) {
    return format(dateObj, 'MMMM d');
  }
  
  return format(dateObj, 'MMMM d, yyyy');
}

/**
 * Format date with full details
 */
export function formatFullDate(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  return format(dateObj, 'PPpp'); // e.g., "Apr 29, 2023 at 11:01 AM"
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format Unix timestamp (seconds since epoch)
 */
export function formatUnixTimestamp(timestamp: number): string {
  if (!timestamp || timestamp === 0) {
    return 'Never';
  }
  
  const dateObj = new Date(timestamp * 1000);
  return formatTimestamp(dateObj);
}
