import { Account, OutreachLog, Prospect, PlanItem } from './types';

// Helper to generate a random ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Mock coordinates for cities (Lat, Lng)
const CITY_COORDINATES: Record<string, { lat: number, lng: number }> = {
  'Tyler': { lat: 32.3513, lng: -95.3011 },
  'Longview': { lat: 32.5007, lng: -94.7405 },
  'Whitehouse': { lat: 32.2224, lng: -95.2222 },
  'Lindale': { lat: 32.5132, lng: -95.4074 },
  'Kilgore': { lat: 32.3854, lng: -94.8752 },
  'Chandler': { lat: 32.3057, lng: -95.4783 },
  'Athens': { lat: 32.2057, lng: -95.8552 },
  'Jacksonville': { lat: 31.9652, lng: -95.2677 },
  'Bullard': { lat: 32.1463, lng: -95.3230 },
  'Mineola': { lat: 32.6635, lng: -95.4852 },
  'Henderson': { lat: 32.1532, lng: -94.7994 }
};

// Function to add jitter to coordinates so points don't overlap perfectly
const getCoordinates = (city: string) => {
  const base = CITY_COORDINATES[city] || CITY_COORDINATES['Tyler']; // Default to Tyler
  return {
    lat: base.lat + (Math.random() - 0.5) * 0.05, // +/- 0.025 degrees jitter
    lng: base.lng + (Math.random() - 0.5) * 0.05
  };
};

// Parse CSV text into an array of objects
export const parseCSV = (text: string): any[] => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Handle potential quotes in CSV (basic handling)
  const parseLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const obj: any = {};
    headers.forEach((header, index) => {
      // Clean headers to be camelCase-ish or key-friendly
      obj[header] = values[index] ? values[index].replace(/^"|"$/g, '').trim() : '';
    });
    return obj;
  });
};

export const cleanAccountsData = (rawData: any[]): Account[] => {
  return rawData.map(row => {
    // Basic city extraction for mapping
    let city = 'Tyler'; 
    const address = row['Location Address'] || '';
    if (address.includes('Longview')) city = 'Longview';
    else if (address.includes('Kilgore')) city = 'Kilgore';
    else if (address.includes('Lindale')) city = 'Lindale';
    
    return {
      companyName: row['Company Name'] || '',
      locationName: row['Location Name'] || '',
      address: address,
      containerSize: parseFloat(row['Container Size (yd3)']) || 0,
      monthlyRevenue: parseFloat(row['Projected Monthly Revenue ($)']) || 0,
      monthlyProfit: parseFloat(row['Projected Monthly Profit ($)']) || 0,
      fillFrequency: parseFloat(row['Fill Frequency (per month)']) || 0,
      coordinates: getCoordinates(city)
    };
  }).filter(a => a.companyName);
};

export const cleanProspectsData = (rawData: any[], existingAccounts: Account[]): Prospect[] => {
  const accountNames = new Set(existingAccounts.map(a => a.companyName.toLowerCase()));

  return rawData.map(row => {
    const name = row['Company Name'] || row['Company'] || '';
    const isCustomer = accountNames.has(name.toLowerCase()) || (row['Is Deployed'] === 'TRUE' || row['Is Deployed'] === true);
    
    // Attempt to extract City from Address if City column missing
    let city = row['City'] || '';
    if (!city && row['Address']) {
      const parts = row['Address'].split(',');
      if (parts.length >= 2) {
        // Very basic heuristic: City is usually 2nd to last or middle
        city = parts[parts.length - 2].trim().split(' ')[0]; 
      }
      // Fallback heuristics based on address text
      if (!city) {
        if (row['Address'].includes('Tyler')) city = 'Tyler';
        else if (row['Address'].includes('Lindale')) city = 'Lindale';
        else if (row['Address'].includes('Whitehouse')) city = 'Whitehouse';
        else if (row['Address'].includes('Longview')) city = 'Longview';
        else if (row['Address'].includes('Kilgore')) city = 'Kilgore';
      }
    }
    // Normalize city for mapping
    const mapCity = city.replace(/[^a-zA-Z]/g, '');

    return {
      id: generateId(),
      companyName: name,
      address: row['Address'] || row['Street'] || '',
      city: city || 'Tyler',
      industry: row['Industry'] || 'Unknown',
      phone: row['Phone'] || '',
      priorityScore: parseInt(row['Priority Score']) || 50,
      status: (isCustomer ? 'Customer' : 'New') as Prospect['status'],
      isDeployed: isCustomer,
      containerPotential: row['Container Size (yd3)'] || '30', 
      lastContactDate: row['Last Outreach Date'] || '',
      nextStep: row['Next Step'] || '',
      nextStepDue: row['Next Step Due'] || '',
      coordinates: getCoordinates(mapCity || 'Tyler')
    };
  }).filter(p => p.companyName && p.companyName !== 'Company Name'); 
};

export const cleanOutreachData = (rawData: any[]): OutreachLog[] => {
  return rawData.map(row => ({
    id: generateId(),
    company: row['Company'] || '',
    date: row['Visit/Call Date'] || new Date().toISOString().split('T')[0],
    type: 'Visit' as OutreachLog['type'],
    outcome: (row['Outcome'] || 'Nurture') as OutreachLog['outcome'],
    notes: row['Notes'] || '',
    nextStep: row['Next Step'] || '',
    nextStepDueDate: row['Next Step Due'] || ''
  })).filter(o => o.company);
};

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(fieldName => {
      const val = row[fieldName] ? String(row[fieldName]).replace(/"/g, '""') : '';
      return `"${val}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
};

export const getDaysSince = (dateStr: string): number => {
  if (!dateStr) return 999;
  const last = new Date(dateStr);
  const now = new Date();
  if (isNaN(last.getTime())) return 999;
  const diffTime = Math.abs(now.getTime() - last.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

/**
 * DEEP INSIGHTS PLANNING ALGORITHM
 * 
 * 1. Score every prospect based on:
 *    - Next Step Due Date (Critical)
 *    - Priority Score (High value targets)
 *    - Recency of Contact (Don't visit if visited < 7 days ago, unless due)
 *    - Status (Prefer Qualified/Contacted over New for closing)
 * 2. Identify the "Anchor" prospect (highest score).
 * 3. Cluster recommendations around the Anchor's location (City).
 */
export const generateSmartPlan = (prospects: Prospect[], maxStops: number = 12): PlanItem[] => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // 1. Scoring Phase
  const scoredProspects = prospects.map(p => {
    let score = p.priorityScore || 0; // Base score from CSV data (0-100)
    let reason = "High Value Prospect";

    const daysSince = getDaysSince(p.lastContactDate || '');
    
    // Rule: Next Step Due
    if (p.nextStepDue && p.nextStepDue <= tomorrowStr) {
      score += 200; // Massive boost for due tasks
      reason = `Follow-up Due: ${p.nextStep || 'Check in'}`;
    }

    // Rule: Outcome Momentum
    // (This requires looking at recent logs, but we'll approximate using status for now 
    // or assume the prospect object is updated with latest status)
    if (p.status === 'Qualified') {
      score += 30;
      reason = "Qualified Lead - Push to close";
    }

    // Rule: Stale High Value Leads
    if (p.priorityScore >= 80 && daysSince > 30 && p.status !== 'Customer' && p.status !== 'Lost') {
      score += 50;
      reason = "High Priority - At Risk (Stale)";
    }

    // Rule: Don't bug recently visited (unless due)
    if (daysSince < 7 && score < 200) {
      score -= 500; // Bury it
    }

    // Rule: Customers need less frequent visits unless specific issue
    if (p.status === 'Customer' && score < 200) {
      score -= 50; // De-prioritize maintenance visits unless due
    }

    return {
      ...p,
      planScore: score,
      reason
    } as PlanItem;
  });

  // Filter out low scores
  const candidates = scoredProspects.filter(p => p.planScore > 0).sort((a, b) => b.planScore - a.planScore);

  if (candidates.length === 0) return [];

  // 2. Anchoring & Clustering Phase
  const plan: PlanItem[] = [];
  const anchor = candidates[0]; // Highest score is our anchor
  plan.push(anchor);

  const remaining = candidates.slice(1);
  
  // Fill the rest of the plan with prospects in the same city/area to minimize driving
  const sameCity = remaining.filter(p => p.city === anchor.city);
  const otherCities = remaining.filter(p => p.city !== anchor.city);

  // Take up to (maxStops) from same city, prioritized by score
  plan.push(...sameCity.slice(0, maxStops - 1));

  // If we still need more stops, take the highest scoring from nearby/other cities
  if (plan.length < maxStops) {
    plan.push(...otherCities.slice(0, maxStops - plan.length));
  }

  return plan;
};