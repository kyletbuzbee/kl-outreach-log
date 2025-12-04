import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Download, Plus, Search, MapPin, Phone, 
  Calendar, CheckCircle, AlertCircle, 
  BarChart2, Truck, DollarSign, Save, ListTodo, Map as MapIcon, User, Mail, Navigation, X, Clock, FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Account, OutreachLog, Prospect, DashboardStats, Task, PlanItem } from './types';
import { cleanAccountsData, cleanOutreachData, cleanProspectsData, exportToCSV, parseCSV, formatDate, getDaysSince, generateId, generateSmartPlan } from './utils';

// Global Leaflet declaration for CDN usage
declare const L: any;

// --- Components ---

const FileUploader = ({ onDataLoaded }: { onDataLoaded: (accounts: Account[], prospects: Prospect[], outreach: OutreachLog[]) => void }) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'accounts' | 'prospects' | 'outreach') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        
        if (type === 'accounts') onDataLoaded(cleanAccountsData(parsed), [], []);
        if (type === 'prospects') onDataLoaded([], cleanProspectsData(parsed, []), []);
        if (type === 'outreach') onDataLoaded([], [], cleanOutreachData(parsed));
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {['accounts', 'prospects', 'outreach'].map((type) => (
        <div key={type} className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition-colors cursor-pointer relative group">
          <Upload className="h-8 w-8 text-teal-600 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-gray-600 capitalize">Upload {type}.csv</span>
          <input 
            type="file" 
            accept=".csv"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label={`Upload ${type}.csv`}
            // @ts-ignore
            onChange={(e) => handleFileUpload(e, type as any)}
          />
        </div>
      ))}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 flex items-center border border-gray-100">
    <div className={`p-3 rounded-full mr-4 ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

const DetailModal = ({ prospect, logs, onClose, onLogVisit }: { prospect: Prospect, logs: OutreachLog[], onClose: () => void, onLogVisit: (name: string) => void }) => {
  if (!prospect) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{prospect.companyName}</h2>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                ${prospect.status === 'Customer' ? 'bg-green-100 text-green-800' : 
                  prospect.status === 'Qualified' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                {prospect.status}
              </span>
            </div>
            <p className="text-gray-500 flex items-center text-sm">
              <MapPin className="w-4 h-4 mr-1" /> {prospect.address}, {prospect.city}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Details */}
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Priority Score</span>
                    <span className={`font-bold text-lg ${prospect.priorityScore >= 80 ? 'text-green-600' : 'text-gray-800'}`}>
                      {prospect.priorityScore}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Industry</span>
                    <span className="font-medium">{prospect.industry}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Phone</span>
                    <a href={`tel:${prospect.phone}`} className="text-teal-600 hover:underline">{prospect.phone || 'N/A'}</a>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Est. Container Size</span>
                    <span className="font-medium">{prospect.containerPotential || 'Unknown'} yd³</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Primary Contact</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium">{prospect.contactName || 'No contact listed'}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium">{prospect.email || 'No email listed'}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => { onClose(); onLogVisit(prospect.companyName); }}
                className="w-full py-3 bg-teal-600 text-white rounded-lg font-bold shadow-md hover:bg-teal-700 transition-colors flex items-center justify-center"
              >
                <Plus className="w-5 h-5 mr-2" /> Log New Interaction
              </button>
            </div>

            {/* Right Column: History Timeline */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                <Clock className="w-4 h-4 mr-2" /> Activity History
              </h3>
              
              <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pb-4">
                {logs.length === 0 ? (
                  <div className="ml-6 text-gray-500 text-sm italic">No history found. Log your first visit!</div>
                ) : (
                  logs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => (
                    <div key={log.id} className="ml-6 relative group">
                      <div className={`absolute -left-[31px] mt-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm 
                        ${log.outcome === 'Won' ? 'bg-green-500' : log.outcome === 'Interested' ? 'bg-blue-500' : 'bg-gray-400'}`} 
                      />
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-gray-800 text-sm">{formatDate(log.date)}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium
                            ${log.outcome === 'Won' ? 'bg-green-100 text-green-700' : 
                              log.outcome === 'Interested' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                            {log.outcome}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3 leading-relaxed">{log.notes || 'No notes logged.'}</p>
                        {log.nextStep && (
                          <div className="flex items-center text-xs text-teal-700 font-medium bg-teal-50 p-2 rounded">
                            <Navigation className="w-3 h-3 mr-2" />
                            Next: {log.nextStep} 
                            {log.nextStepDueDate && <span className="ml-1 text-teal-600 font-normal">(Due {formatDate(log.nextStepDueDate)})</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LogVisitForm = ({ prospects, onLogSave, initialCompany }: { prospects: Prospect[], onLogSave: (log: OutreachLog) => void, initialCompany?: string }) => {
  const [selectedCompany, setSelectedCompany] = useState(initialCompany || '');
  const [searchTerm, setSearchTerm] = useState(initialCompany || '');
  const [outcome, setOutcome] = useState<OutreachLog['outcome']>('Interested');
  const [notes, setNotes] = useState('');
  const [nextStep, setNextStep] = useState('Follow up in 3 months');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Extra fields for 'Won' outcome
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (initialCompany) {
      setSelectedCompany(initialCompany);
      setSearchTerm(initialCompany);
    }
  }, [initialCompany]);

  const filteredProspects = prospects
    .filter(p => p.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 5);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return alert("Please select a company");

    const newLog: OutreachLog = {
      id: generateId(),
      company: selectedCompany,
      date,
      type: 'Visit',
      outcome,
      notes,
      nextStep,
      nextStepDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contactName: outcome === 'Won' ? contactName : undefined,
      email: outcome === 'Won' ? contactEmail : undefined
    };
    onLogSave(newLog);
    
    // Reset form
    setNotes('');
    setSearchTerm('');
    setSelectedCompany('');
    setContactName('');
    setContactEmail('');
    setOutcome('Interested');
    alert("Visit Logged Successfully!");
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-teal-100 h-fit sticky top-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <Plus className="w-5 h-5 mr-2 text-teal-600" /> 
        Log Visit / Call
      </h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="relative">
          <label htmlFor="company-search" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input 
              id="company-search"
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Search prospects..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedCompany(e.target.value); // Allow free text if new
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
          </div>
          {showSuggestions && searchTerm && (
            <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filteredProspects.map(p => (
                <div 
                  key={p.id}
                  className="px-4 py-3 hover:bg-teal-50 cursor-pointer border-b border-gray-100 last:border-0"
                  onClick={() => {
                    setSelectedCompany(p.companyName);
                    setSearchTerm(p.companyName);
                    setShowSuggestions(false);
                  }}
                >
                  <p className="font-medium text-gray-800">{p.companyName}</p>
                  <p className="text-xs text-gray-500">{p.address} • {p.city}</p>
                </div>
              ))}
              {filteredProspects.length === 0 && (
                <div className="px-4 py-3 text-gray-500 text-sm">No existing match - will add new.</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="log-date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input 
              id="log-date"
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-teal-500"
            />
          </div>
          <div>
            <label htmlFor="log-outcome" className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
            <select 
              id="log-outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-teal-500"
            >
              <option value="Interested">Interested</option>
              <option value="Has Vendor">Has Vendor</option>
              <option value="No Scrap">No Scrap</option>
              <option value="Not Interested">Not Interested</option>
              <option value="Won">Won / Deployed</option>
              <option value="Nurture">Nurture</option>
              <option value="Corporate/Manager Approval">Corp Approval Needed</option>
            </select>
          </div>
        </div>

        {/* Dynamic Contact Fields for Won Outcome */}
        {outcome === 'Won' && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-bold text-green-800 mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1"/> Capture Customer Details
            </h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="contact-name" className="block text-xs font-medium text-green-700 mb-1">Primary Contact Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-green-600" />
                  <input 
                    id="contact-name"
                    type="text" 
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-green-300 rounded-lg focus:ring-green-500 text-sm"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-xs font-medium text-green-700 mb-1">Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-green-600" />
                  <input 
                    id="contact-email"
                    type="email" 
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-green-300 rounded-lg focus:ring-green-500 text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="log-notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea 
            id="log-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-teal-500"
            placeholder="Key takeaways, objections, container needs..."
          />
        </div>

        <div>
          <label htmlFor="log-next-step" className="block text-sm font-medium text-gray-700 mb-1">Next Step</label>
          <input 
            id="log-next-step"
            type="text" 
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-teal-500"
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-700 transition duration-200 flex justify-center items-center"
        >
          <Save className="w-4 h-4 mr-2" /> Save Log
        </button>
      </form>
    </div>
  );
};

const ProspectTable = ({ prospects, onSelectProspect }: { prospects: Prospect[], onSelectProspect: (p: Prospect) => void }) => {
  const [filter, setFilter] = useState('All');
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Customer': return 'bg-green-100 text-green-800';
      case 'Qualified': return 'bg-blue-100 text-blue-800';
      case 'Lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filtered = prospects.filter(p => {
    if (filter === 'All') return true;
    if (filter === 'High Priority') return p.priorityScore >= 80;
    if (filter === 'Stale') {
      const days = getDaysSince(p.lastContactDate || '');
      return days > 30 && p.status !== 'Customer' && p.status !== 'Lost';
    }
    return p.status === filter;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="font-semibold text-gray-700 flex items-center">
          <Truck className="w-4 h-4 mr-2" /> Route & Prospect List
        </h3>
        <div className="flex space-x-2">
          {['All', 'High Priority', 'Stale', 'Customer'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${filter === f ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-3">Company</th>
              <th className="px-6 py-3">City</th>
              <th className="px-6 py-3">Score</th>
              <th className="px-6 py-3">Last Contact</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Contact Info</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.slice(0, 50).map((p) => (
              <tr 
                key={p.id} 
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onSelectProspect(p)}
              >
                <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                  {p.companyName}
                  {p.priorityScore >= 80 && <AlertCircle className="w-3 h-3 ml-2 text-orange-500" />}
                </td>
                <td className="px-6 py-4">{p.city}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className={`font-bold ${p.priorityScore > 80 ? 'text-green-600' : p.priorityScore > 50 ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {p.priorityScore}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs">
                  {p.lastContactDate ? (
                    <span className={getDaysSince(p.lastContactDate) > 30 ? 'text-red-500 font-bold' : ''}>
                      {formatDate(p.lastContactDate)} ({getDaysSince(p.lastContactDate)} days ago)
                    </span>
                  ) : <span className="text-gray-400">Never</span>}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(p.status)}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs">
                  {p.status === 'Customer' ? (
                    <div className="flex flex-col">
                      {p.contactName ? <span className="font-semibold text-gray-800 flex items-center"><User className="w-3 h-3 mr-1"/> {p.contactName}</span> : <span className="italic text-gray-400">No contact</span>}
                      {p.email && <span className="text-gray-500 flex items-center"><Mail className="w-3 h-3 mr-1"/> {p.email}</span>}
                    </div>
                  ) : <span className="text-gray-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 text-center text-xs text-gray-400 border-t border-gray-100">
        Showing top 50 results
      </div>
    </div>
  );
};

const MapView = ({ prospects, onSelectProspect }: { prospects: Prospect[], onSelectProspect: (p: Prospect) => void }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (mapContainer.current && !mapRef.current) {
      mapRef.current = L.map(mapContainer.current).setView([32.3513, -95.3011], 9);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
    }

    if (mapRef.current) {
      // Clear markers
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          mapRef.current.removeLayer(layer);
        }
      });

      // Add Markers
      prospects.forEach(p => {
        if (p.coordinates) {
          const color = p.status === 'Customer' ? 'green' : p.priorityScore > 80 ? 'orange' : 'blue';
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          const marker = L.marker([p.coordinates.lat, p.coordinates.lng], { icon })
            .addTo(mapRef.current);
          
          // On click, trigger selection instead of standard popup
          marker.on('click', () => onSelectProspect(p));
          
          // Tooltip on hover
          marker.bindTooltip(`<b>${p.companyName}</b>`, { direction: 'top', offset: [0, -5] });
        }
      });
    }
  }, [prospects, onSelectProspect]);

  return (
    <div className="h-[600px] w-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
      <div ref={mapContainer} className="h-full w-full z-0" />
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-md z-[400] text-xs space-y-2">
        <div className="font-semibold text-gray-700 mb-1">Legend</div>
        <div className="flex items-center"><div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div> Customer</div>
        <div className="flex items-center"><div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div> High Priority</div>
        <div className="flex items-center"><div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div> Prospect</div>
      </div>
    </div>
  );
};

const SmartPlanView = ({ prospects, onSelectProspect }: { prospects: Prospect[], onSelectProspect: (p: Prospect) => void }) => {
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const generated = generateSmartPlan(prospects);
    setPlan(generated);
  }, [prospects]);

  // Leaflet for Route
  useEffect(() => {
    if (mapContainer.current && !mapRef.current) {
      mapRef.current = L.map(mapContainer.current).setView([32.3513, -95.3011], 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    if (mapRef.current && plan.length > 0) {
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          mapRef.current.removeLayer(layer);
        }
      });

      const latlngs: any[] = [];

      plan.forEach((p, index) => {
        if (p.coordinates) {
          const latlng = [p.coordinates.lat, p.coordinates.lng];
          latlngs.push(latlng);

          const iconHtml = `<div style="background-color:#0f766e; color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; border:2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`;
          
          const icon = L.divIcon({
            className: 'route-icon',
            html: iconHtml,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = L.marker(latlng, { icon }).addTo(mapRef.current);
          marker.on('click', () => onSelectProspect(p));
        }
      });

      if (latlngs.length > 0) {
        L.polyline(latlngs, { color: 'teal', weight: 4, opacity: 0.8, dashArray: '1, 0' }).addTo(mapRef.current);
        mapRef.current.fitBounds(L.latLngBounds(latlngs).pad(0.1));
      }
    }
  }, [plan, onSelectProspect]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* List */}
      <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-teal-50">
          <h2 className="font-bold text-teal-900 flex items-center">
            <Navigation className="w-5 h-5 mr-2" /> Next Day Plan
          </h2>
          <p className="text-xs text-teal-700 mt-1">
            Optimized based on due dates, priority score, and location.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {plan.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              No plan generated. Ensure prospects are loaded.
            </div>
          ) : (
            plan.map((item, idx) => (
              <div 
                key={item.id} 
                onClick={() => onSelectProspect(item)}
                className="border border-gray-100 rounded-lg p-3 hover:bg-teal-50 transition-colors relative cursor-pointer group"
              >
                <div className="absolute top-3 right-3 text-xs font-bold text-gray-300 group-hover:text-teal-200">#{idx + 1}</div>
                <h3 className="font-semibold text-gray-800">{item.companyName}</h3>
                <div className="text-xs text-teal-600 font-medium mb-1">{item.reason}</div>
                <div className="text-xs text-gray-500 flex items-center">
                  <MapPin className="w-3 h-3 mr-1"/> {item.address}, {item.city}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={() => setPlan(generateSmartPlan(prospects))}
            className="w-full bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            Regenerate Plan
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="lg:col-span-2 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
        <div ref={mapContainer} className="h-full w-full" />
      </div>
    </div>
  );
};

const TasksView = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCompany, setNewTaskCompany] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('Medium');

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    
    const task: Task = {
      id: generateId(),
      title: newTaskTitle,
      relatedCompany: newTaskCompany,
      dueDate: newTaskDue || new Date().toISOString().split('T')[0],
      priority: newTaskPriority,
      status: 'To Do'
    };
    
    setTasks([...tasks, task]);
    setNewTaskTitle('');
    setNewTaskCompany('');
    setNewTaskDue('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'To Do' ? 'Done' : 'To Do' } : t));
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Task</h3>
        <form onSubmit={addTask} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="task-title" className="block text-xs font-medium text-gray-500 mb-1">Task</label>
            <input 
              id="task-title"
              className="w-full px-3 py-2 border rounded-lg text-sm" 
              placeholder="e.g. Call for invoice..."
              value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
            />
          </div>
          <div className="w-[200px]">
            <label htmlFor="related-company" className="block text-xs font-medium text-gray-500 mb-1">Related Company</label>
            <input 
              id="related-company"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Company Name"
              value={newTaskCompany} onChange={e => setNewTaskCompany(e.target.value)}
            />
          </div>
          <div className="w-[150px]">
            <label htmlFor="task-due-date" className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
            <input 
              id="task-due-date"
              type="date"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)}
            />
          </div>
          <div className="w-[120px]">
            <label htmlFor="task-priority" className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <select 
              id="task-priority"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as any)}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700">Add Task</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-700 flex items-center"><ListTodo className="w-4 h-4 mr-2"/> Task Board</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {tasks.length === 0 && <div className="p-8 text-center text-gray-400">No tasks yet. Add one above!</div>}
          {tasks.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(task => (
            <div key={task.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 ${task.status === 'Done' ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-4">
                <input 
                  type="checkbox" 
                  checked={task.status === 'Done'} 
                  onChange={() => toggleTask(task.id)}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500 border-gray-300"
                  aria-label={`Mark task "${task.title}" as ${task.status === 'Done' ? 'incomplete' : 'done'}`}
                />
                <div>
                  <p className={`font-medium ${task.status === 'Done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>{task.title}</p>
                  <p className="text-xs text-gray-500">{task.relatedCompany} • Due: {formatDate(task.dueDate)}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prospects' | 'map' | 'outreach' | 'tasks' | 'plan'>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [outreachLogs, setOutreachLogs] = useState<OutreachLog[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  
  // Data processing and linking
  useEffect(() => {
    if (prospects.length > 0 && accounts.length > 0) {
      const updatedProspects = prospects.map(p => {
        // Link Account status
        const acct = accounts.find(a => a.companyName.toLowerCase() === p.companyName.toLowerCase());
        const logs = outreachLogs.filter(o => o.company.toLowerCase() === p.companyName.toLowerCase());
        
        // Find most recent log
        logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastLog = logs[0];

        return {
          ...p,
          isDeployed: !!acct || p.isDeployed,
          status: !!acct ? 'Customer' : lastLog ? (lastLog.outcome === 'Won' ? 'Customer' : 'Contacted') : p.status,
          lastContactDate: lastLog ? lastLog.date : p.lastContactDate,
          nextStep: lastLog ? lastLog.nextStep : p.nextStep,
          nextStepDue: lastLog ? lastLog.nextStepDueDate : p.nextStepDue,
          // Update contact info if captured in logs
          contactName: lastLog?.contactName || p.contactName,
          email: lastLog?.email || p.email
        };
      });
      if (JSON.stringify(updatedProspects) !== JSON.stringify(prospects)) {
        setProspects(updatedProspects);
      }
    }
  }, [accounts, outreachLogs]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDataLoaded = (newAccounts: Account[], newProspects: Prospect[], newOutreach: OutreachLog[]) => {
    if (newAccounts.length) setAccounts(newAccounts);
    if (newProspects.length) setProspects(newProspects);
    if (newOutreach.length) setOutreachLogs(newOutreach);
  };

  const handleNewLog = (log: OutreachLog) => {
    setOutreachLogs([log, ...outreachLogs]);
    // Update prospect in real-time
    setProspects(prev => prev.map(p => 
      p.companyName === log.company 
        ? { 
            ...p, 
            lastContactDate: log.date, 
            status: log.outcome === 'Won' ? 'Customer' : 'Contacted',
            contactName: log.contactName || p.contactName,
            email: log.email || p.email
          }
        : p
    ));
  };

  const exportData = () => {
    exportToCSV(outreachLogs, `KL_Outreach_Export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const selectedProspect = selectedProspectId ? prospects.find(p => p.id === selectedProspectId) : null;
  const selectedLogs = selectedProspect ? outreachLogs.filter(o => o.company.toLowerCase() === selectedProspect.companyName.toLowerCase()) : [];

  // Derived Stats
  const stats: DashboardStats = {
    totalProspects: prospects.length,
    activeCustomers: prospects.filter(p => p.status === 'Customer').length,
    highPriorityLeads: prospects.filter(p => p.priorityScore >= 80 && p.status !== 'Customer' && p.status !== 'Lost').length,
    dueForFollowUp: prospects.filter(p => {
      if (!p.lastContactDate || p.status === 'Customer') return false;
      return getDaysSince(p.lastContactDate) > 30;
    }).length,
    monthlyPotentialRevenue: accounts.reduce((sum, acc) => sum + (acc.monthlyRevenue || 0), 0)
  };

  // Chart Data
  const stageData = [
    { name: 'New', value: prospects.filter(p => p.status === 'New').length, color: '#94a3b8' },
    { name: 'Contacted', value: prospects.filter(p => p.status === 'Contacted').length, color: '#f59e0b' },
    { name: 'Qualified', value: prospects.filter(p => p.status === 'Qualified').length, color: '#3b82f6' },
    { name: 'Customer', value: prospects.filter(p => p.status === 'Customer').length, color: '#14b8a6' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Detail Modal */}
      {selectedProspect && (
        <DetailModal 
          prospect={selectedProspect} 
          logs={selectedLogs} 
          onClose={() => setSelectedProspectId(null)}
          onLogVisit={(company) => {
            setSelectedProspectId(null);
            // This is a quick hack to switch tab and prefill. In a real app we'd pass state differently.
            setActiveTab('dashboard'); 
            // We rely on the user to type it or we could add a prop to LogVisitForm to accept initial value.
            // Let's modify LogVisitForm to accept an initialCompany prop.
          }} 
        />
      )}

      {/* Sidebar Navigation */}
      <div className="bg-slate-900 text-white w-full md:w-64 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center mr-3 font-bold text-lg">K</div>
          <span className="font-bold text-xl tracking-tight">K&L CRM</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
            { id: 'prospects', label: 'Prospects', icon: Truck },
            { id: 'plan', label: 'Next Day Plan', icon: Navigation },
            { id: 'map', label: 'Map View', icon: MapIcon },
            { id: 'tasks', label: 'Tasks', icon: ListTodo },
            { id: 'outreach', label: 'Outreach Log', icon: Phone },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? 'bg-teal-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={exportData}
            className="w-full flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors text-slate-300"
          >
            <Download className="w-4 h-4 mr-2" /> Export to Sheets
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        
        {/* Header Area */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'prospects' && 'Prospects List'}
              {activeTab === 'map' && 'Territory Map'}
              {activeTab === 'tasks' && 'Task Management'}
              {activeTab === 'plan' && 'Next Day Visit Plan'}
              {activeTab === 'outreach' && 'Outreach History'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage your pipeline and track your visits.</p>
          </div>
          <div className="text-sm text-gray-400">
            {prospects.length > 0 ? <span className="text-teal-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Data Loaded</span> : 'No Data'}
          </div>
        </div>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Upload if empty */}
            {prospects.length === 0 && <FileUploader onDataLoaded={handleDataLoaded} />}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Prospects" value={stats.totalProspects} icon={Search} color="bg-blue-500" />
              <StatCard title="Active Customers" value={stats.activeCustomers} icon={CheckCircle} color="bg-teal-500" />
              <StatCard title="High Priority Leads" value={stats.highPriorityLeads} icon={AlertCircle} color="bg-orange-500" />
              <StatCard title="Est. Monthly Revenue" value={`$${stats.monthlyPotentialRevenue.toLocaleString()}`} icon={DollarSign} color="bg-green-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Log Form */}
              <div className="lg:col-span-1">
                <LogVisitForm prospects={prospects} onLogSave={handleNewLog} />
              </div>

              {/* Pipeline Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-4">Pipeline Status</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stageData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: '#f3f4f6' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {stageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Stale Leads */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-red-500" />
                Neglected Leads (&gt;30 Days No Contact)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-500 bg-gray-50 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2">Company</th>
                      <th className="px-4 py-2">City</th>
                      <th className="px-4 py-2">Priority</th>
                      <th className="px-4 py-2">Last Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospects
                      .filter(p => getDaysSince(p.lastContactDate || '') > 30 && p.status !== 'Customer')
                      .sort((a,b) => b.priorityScore - a.priorityScore)
                      .slice(0, 5)
                      .map(p => (
                        <tr 
                          key={p.id} 
                          className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedProspectId(p.id)}
                        >
                          <td className="px-4 py-3 font-medium">{p.companyName}</td>
                          <td className="px-4 py-3 text-gray-500">{p.city}</td>
                          <td className="px-4 py-3 font-bold text-orange-600">{p.priorityScore}</td>
                          <td className="px-4 py-3 text-red-500">{getDaysSince(p.lastContactDate || '')} days ago</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Prospects View */}
        {activeTab === 'prospects' && (
          <div className="space-y-6">
            <ProspectTable prospects={prospects} onSelectProspect={(p) => setSelectedProspectId(p.id)} />
          </div>
        )}

        {/* Map View */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Geographic Distribution</h3>
              <span className="text-xs text-gray-500">Showing {prospects.length} locations</span>
            </div>
            <MapView prospects={prospects} onSelectProspect={(p) => setSelectedProspectId(p.id)} />
          </div>
        )}

        {/* Smart Plan View */}
        {activeTab === 'plan' && <SmartPlanView prospects={prospects} onSelectProspect={(p) => setSelectedProspectId(p.id)} />}

        {/* Tasks View */}
        {activeTab === 'tasks' && <TasksView />}

        {/* Outreach View */}
        {activeTab === 'outreach' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-700">Outreach Log History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Company</th>
                    <th className="px-6 py-3">Outcome</th>
                    <th className="px-6 py-3">Notes</th>
                    <th className="px-6 py-3">Next Step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {outreachLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(log.date)}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{log.company}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                          ${log.outcome === 'Won' ? 'bg-green-100 text-green-800' : 
                            log.outcome === 'Interested' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {log.outcome}
                        </span>
                      </td>
                      <td className="px-6 py-4 truncate max-w-xs" title={log.notes}>{log.notes}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {log.nextStep} 
                        {log.nextStepDueDate && <span className="block text-gray-400">Due: {formatDate(log.nextStepDueDate)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
