export interface Account {
  companyName: string;
  locationName: string;
  address: string;
  containerSize: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  fillFrequency: number;
  coordinates?: { lat: number; lng: number };
}

export interface Prospect {
  id: string;
  companyName: string;
  address: string;
  city: string;
  industry: string;
  phone: string;
  priorityScore: number;
  status: 'New' | 'Contacted' | 'Qualified' | 'Customer' | 'Lost';
  isDeployed: boolean;
  lastContactDate?: string;
  nextStep?: string;
  nextStepDue?: string;
  notes?: string;
  containerPotential?: string;
  coordinates?: { lat: number; lng: number };
  contactName?: string;
  email?: string;
}

export interface OutreachLog {
  id: string;
  company: string;
  date: string;
  type: 'Visit' | 'Call' | 'Email';
  outcome: 'Interested' | 'Has Vendor' | 'No Scrap' | 'Not Interested' | 'Won' | 'Nurture' | 'Corporate/Manager Approval';
  notes: string;
  nextStep: string;
  nextStepDueDate: string;
  contactName?: string; // Captured on won
  email?: string; // Captured on won
}

export interface Task {
  id: string;
  title: string;
  relatedCompany: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'Done';
}

export interface PlanItem extends Prospect {
  reason: string;
  planScore: number;
  distanceFromAnchor?: number;
}

export interface DashboardStats {
  totalProspects: number;
  activeCustomers: number;
  highPriorityLeads: number;
  dueForFollowUp: number;
  monthlyPotentialRevenue: number;
}