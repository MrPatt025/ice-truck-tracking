// Shared utilities for Ice Truck Tracking System

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const validateEmail = (email: string): boolean => {
  if (email.length === 0 || email !== email.trim()) {
    return false
  }

  const atIndex = email.indexOf('@')
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@') || atIndex === email.length - 1) {
    return false
  }

  const localPart = email.slice(0, atIndex)
  const domainPart = email.slice(atIndex + 1)

  if (
    localPart.startsWith('.')
    || localPart.endsWith('.')
    || domainPart.startsWith('.')
    || domainPart.endsWith('.')
    || localPart.includes(' ')
    || domainPart.includes(' ')
    || !domainPart.includes('.')
    || domainPart.includes('..')
  ) {
    return false
  }

  return localPart.length <= 64 && domainPart.length <= 255
}
