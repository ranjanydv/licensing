import { Feature } from '../interfaces/license.interface';
import { Logger } from './logger';
const logger = new Logger('FeatureValidation');

/**
 * Result of feature validation
 */
export interface FeatureValidationResult {
  isValid: boolean;
  feature: string;
  message?: string;
  restrictionDetails?: Record<string, any>;
}

/**
 * Types of feature restrictions
 */
export enum RestrictionType {
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  STRING = 'string',
  ARRAY = 'array',
  RANGE = 'range',
  ALLOWED_VALUES = 'allowed_values',
  FORBIDDEN_VALUES = 'forbidden_values',
  REGEX = 'regex',
  DATE_RANGE = 'date_range',
  TIME_RANGE = 'time_range',
  IP_RANGE = 'ip_range',
  CUSTOM = 'custom'
}

/**
 * Validate if a feature is available in the license
 * @param features List of features in the license
 * @param featureName Name of the feature to check
 * @returns Boolean indicating if the feature is available
 */
export const hasFeature = (features: Feature[], featureName: string): boolean => {
  const feature = features.find(f => f.name === featureName);
  return !!feature && feature.enabled;
};

/**
 * Check if a value is within a date range
 * @param value Date value to check
 * @param min Minimum date
 * @param max Maximum date
 * @returns Boolean indicating if the value is within range
 */
const isWithinDateRange = (value: any, min: any, max: any): boolean => {
  try {
    const dateValue = new Date(value);
    const minDate = new Date(min);
    const maxDate = new Date(max);
    
    return dateValue >= minDate && dateValue <= maxDate;
  } catch (error) {
    logger.error('Error checking date range', { error });
    return false;
  }
};

/**
 * Check if a value is within a time range (HH:MM format)
 * @param value Time value to check (HH:MM)
 * @param min Minimum time (HH:MM)
 * @param max Maximum time (HH:MM)
 * @returns Boolean indicating if the value is within range
 */
const isWithinTimeRange = (value: any, min: any, max: any): boolean => {
  try {
    // Convert times to minutes for comparison
    const parseTime = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const valueMinutes = parseTime(value);
    const minMinutes = parseTime(min);
    const maxMinutes = parseTime(max);
    
    return valueMinutes >= minMinutes && valueMinutes <= maxMinutes;
  } catch (error) {
    logger.error('Error checking time range', { error });
    return false;
  }
};

/**
 * Check if an IP address is within a range
 * @param ip IP address to check
 * @param range IP range in CIDR notation (e.g., "192.168.1.0/24")
 * @returns Boolean indicating if the IP is within range
 */
const isIpInRange = (ip: string, range: string): boolean => {
  try {
    // Simple implementation for common cases
    // For a production system, use a proper IP library
    
    // Handle exact match
    if (!range.includes('/')) {
      return ip === range;
    }
    
    // Handle CIDR notation
    const [baseIp, bits] = range.split('/');
    const mask = parseInt(bits, 10);
    
    // Convert IP to numeric value
    const ipToLong = (ip: string): number => {
      return ip.split('.')
        .map(octet => parseInt(octet, 10))
        .reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
    };
    
    const ipLong = ipToLong(ip);
    const baseIpLong = ipToLong(baseIp);
    const maskLong = ~((1 << (32 - mask)) - 1) >>> 0;
    
    return (ipLong & maskLong) === (baseIpLong & maskLong);
  } catch (error) {
    logger.error('Error checking IP range', { error });
    return false;
  }
};

/**
 * Validate if a feature meets specific restrictions
 * @param features List of features in the license
 * @param featureName Name of the feature to check
 * @param restrictionKey Specific restriction to check
 * @param value Value to compare against the restriction
 * @returns Boolean indicating if the restriction is met
 */
export const meetsRestriction = (
  features: Feature[],
  featureName: string,
  restrictionKey: string,
  value: any
): boolean => {
  const feature = features.find(f => f.name === featureName);
  
  if (!feature || !feature.enabled) {
    return false;
  }
  
  if (!feature.restrictions || !feature.restrictions[restrictionKey]) {
    // If no restrictions defined, assume it's allowed
    return true;
  }
  
  const restriction = feature.restrictions[restrictionKey];
  
  // Handle different types of restrictions
  if (typeof restriction === 'boolean') {
    return restriction === value;
  } else if (typeof restriction === 'number') {
    if (typeof value === 'number') {
      return value <= restriction; // Assume restriction is a maximum value
    }
    return false;
  } else if (typeof restriction === 'string') {
    // Handle string comparison
    return restriction === value;
  } else if (Array.isArray(restriction)) {
    return restriction.includes(value);
  } else if (typeof restriction === 'object' && restriction !== null) {
    // Handle restriction type
    if ('type' in restriction) {
      switch (restriction.type) {
        case RestrictionType.RANGE:
          if ('min' in restriction && 'max' in restriction && typeof value === 'number') {
            return value >= restriction.min && value <= restriction.max;
          }
          break;
          
        case RestrictionType.ALLOWED_VALUES:
          if ('values' in restriction && Array.isArray(restriction.values)) {
            return restriction.values.includes(value);
          }
          break;
          
        case RestrictionType.FORBIDDEN_VALUES:
          if ('values' in restriction && Array.isArray(restriction.values)) {
            return !restriction.values.includes(value);
          }
          break;
          
        case RestrictionType.REGEX:
          if ('pattern' in restriction && typeof value === 'string') {
            try {
              const regex = new RegExp(restriction.pattern, restriction.flags || '');
              return regex.test(value);
            } catch (error) {
              logger.error('Invalid regex pattern', { pattern: restriction.pattern, error });
              return false;
            }
          }
          break;
          
        case RestrictionType.DATE_RANGE:
          if ('min' in restriction && 'max' in restriction) {
            return isWithinDateRange(value, restriction.min, restriction.max);
          }
          break;
          
        case RestrictionType.TIME_RANGE:
          if ('min' in restriction && 'max' in restriction && typeof value === 'string') {
            return isWithinTimeRange(value, restriction.min, restriction.max);
          }
          break;
          
        case RestrictionType.IP_RANGE:
          if ('range' in restriction && typeof value === 'string') {
            return isIpInRange(value, restriction.range);
          } else if ('ranges' in restriction && Array.isArray(restriction.ranges) && typeof value === 'string') {
            return restriction.ranges.some((range: string) => isIpInRange(value, range));
          }
          break;
          
        case RestrictionType.CUSTOM:
          // For custom restrictions, we need to check if the value meets the custom criteria
          // This would typically be handled by a custom validation function
          // For now, we'll just log a warning and return false
          logger.warn('Custom restriction type not implemented', { featureName, restrictionKey });
          return false;
          
        default:
          logger.warn('Unknown restriction type', { type: restriction.type, featureName, restrictionKey });
          return false;
      }
    } else {
      // Legacy format support
      
      // Handle range restrictions
      if ('min' in restriction && 'max' in restriction) {
        if (typeof value === 'number') {
          return value >= restriction.min && value <= restriction.max;
        }
        return false;
      }
      
      // Handle allowed values
      if ('allowed' in restriction && Array.isArray(restriction.allowed)) {
        return restriction.allowed.includes(value);
      }
      
      // Handle forbidden values
      if ('forbidden' in restriction && Array.isArray(restriction.forbidden)) {
        return !restriction.forbidden.includes(value);
      }
    }
  }
  
  // Default case - if we don't know how to handle this restriction type
  logger.warn('Unknown restriction format', { featureName, restrictionKey, restriction });
  return false;
};

/**
 * Validate a feature against all its restrictions
 * @param features List of features in the license
 * @param featureName Name of the feature to check
 * @param context Context object containing values to check against restrictions
 * @returns Validation result
 */
export const validateFeature = (
  features: Feature[],
  featureName: string,
  context: Record<string, any> = {}
): FeatureValidationResult => {
  const feature = features.find(f => f.name === featureName);
  
  // Check if feature exists and is enabled
  if (!feature) {
    return {
      isValid: false,
      feature: featureName,
      message: `Feature '${featureName}' not found in license`
    };
  }
  
  if (!feature.enabled) {
    return {
      isValid: false,
      feature: featureName,
      message: `Feature '${featureName}' is disabled in license`
    };
  }
  
  // If no restrictions, feature is valid
  if (!feature.restrictions || Object.keys(feature.restrictions).length === 0) {
    return {
      isValid: true,
      feature: featureName
    };
  }
  
  // Check each restriction
  const failedRestrictions: Record<string, any> = {};
  let isValid = true;
  
  for (const [key, restriction] of Object.entries(feature.restrictions)) {
    // Skip if context doesn't have a value for this restriction
    if (!(key in context)) {
      continue;
    }
    
    const value = context[key];
    const restrictionMet = meetsRestriction(features, featureName, key, value);
    
    if (!restrictionMet) {
      failedRestrictions[key] = {
        restriction,
        value
      };
      isValid = false;
    }
  }
  
  if (!isValid) {
    return {
      isValid: false,
      feature: featureName,
      message: `Feature '${featureName}' restrictions not met`,
      restrictionDetails: failedRestrictions
    };
  }
  
  return {
    isValid: true,
    feature: featureName
  };
};

/**
 * Validate multiple features against their restrictions
 * @param features List of features in the license
 * @param featureNames Names of features to check
 * @param context Context object containing values to check against restrictions
 * @returns Array of validation results
 */
export const validateFeatures = (
  features: Feature[],
  featureNames: string[],
  context: Record<string, any> = {}
): FeatureValidationResult[] => {
  return featureNames.map(featureName => validateFeature(features, featureName, context));
};