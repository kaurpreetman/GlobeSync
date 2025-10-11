/**
 * Safely formats a timestamp to a time string
 * @param timestamp - Can be a Date object, string, or number
 * @returns Formatted time string in HH:MM format
 */
export function formatMessageTime(timestamp: Date | string | number | null | undefined): string {
  try {
    if (!timestamp) return "--:--";
    
    const date = timestamp instanceof Date 
      ? timestamp 
      : new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "--:--";
    }
    
    return date.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  } catch (error) {
    console.warn("Error formatting timestamp:", timestamp, error);
    return "--:--";
  }
}

/**
 * Safely formats a date to a readable date string
 * @param date - Can be a Date object, string, or number
 * @returns Formatted date string
 */
export function formatTripDate(date: Date | string | number | null | undefined): string {
  try {
    if (!date) return "Unknown date";
    
    const dateObj = date instanceof Date 
      ? date 
      : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return "Invalid date";
    }
    
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch (error) {
    console.warn("Error formatting date:", date, error);
    return "Invalid date";
  }
}

/**
 * Safely formats a date to a detailed date string
 * @param date - Can be a Date object, string, or number
 * @returns Formatted date string with weekday
 */
export function formatDetailedDate(date: Date | string | number | null | undefined): string {
  try {
    if (!date) return "Unknown date";
    
    const dateObj = date instanceof Date 
      ? date 
      : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return "Invalid date";
    }
    
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.warn("Error formatting detailed date:", date, error);
    return "Invalid date";
  }
}

/**
 * Ensures a value is a proper Date object
 * @param value - Can be a Date object, string, or number
 * @returns A Date object or null if invalid
 */
export function ensureDate(value: Date | string | number | null | undefined): Date | null {
  try {
    if (!value) return null;
    
    const date = value instanceof Date 
      ? value 
      : new Date(value);
    
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.warn("Error ensuring date:", value, error);
    return null;
  }
}