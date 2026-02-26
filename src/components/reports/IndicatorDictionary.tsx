import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface IndicatorDictionaryProps {
  currentUser: any;
}

interface Indicator {
  id: string;
  name: string;
  definition: string;
  numerator: string;
  denominator: string;
  dataSource: string;
  updateFrequency: string;
  department: string;
  category: string;
}

const INDICATORS: Indicator[] = [
  // Clinical
  { id: 'HTS_TST', name: 'HIV Tests Conducted', definition: 'Number of individuals who received HIV testing services and received their results', numerator: 'Count of HIV test records with results', denominator: 'N/A (count indicator)', dataSource: 'clinical-result (hivTest field)', updateFrequency: 'Daily', department: 'Clinical', category: 'Clinical' },
  { id: 'HTS_POS', name: 'HIV Test Positive', definition: 'Number of individuals with confirmed HIV positive test results', numerator: 'Count of HIV test records where result = Positive', denominator: 'Total HIV tests conducted', dataSource: 'clinical-result (hivTest = Positive)', updateFrequency: 'Daily', department: 'Clinical', category: 'Clinical' },
  { id: 'STI_SCREEN', name: 'STI Screenings', definition: 'Number of STI syndromic screenings conducted during clinical visits', numerator: 'Count of STI screening records', denominator: 'Total clinical visits', dataSource: 'clinical-result (type = sti)', updateFrequency: 'Weekly', department: 'Clinical', category: 'Clinical' },
  { id: 'TB_SCREEN', name: 'TB Screenings', definition: 'Number of tuberculosis screenings performed', numerator: 'Count of TB screening records', denominator: 'Total clinical visits', dataSource: 'visit (services include TB screening)', updateFrequency: 'Weekly', department: 'Clinical', category: 'Clinical' },
  { id: 'PREP_NEW', name: 'PrEP Initiations', definition: 'Number of new PrEP initiations during the period', numerator: 'Count of new PrEP prescriptions', denominator: 'Eligible clients', dataSource: 'clinical-result (PrEP RAST eligible)', updateFrequency: 'Monthly', department: 'Clinical', category: 'Clinical' },

  // HIV/ART
  { id: 'TX_NEW', name: 'ART Initiations', definition: 'Number of clients newly initiated on antiretroviral therapy', numerator: 'Count of new ART records with initiation date in period', denominator: 'HIV positive clients not yet on ART', dataSource: 'art-record (initiationDate)', updateFrequency: 'Monthly', department: 'HIV Program', category: 'HIV/ART' },
  { id: 'TX_CURR', name: 'Currently on ART', definition: 'Number of clients currently receiving ART at end of reporting period', numerator: 'Count of ART records with currentStatus = Active', denominator: 'N/A (count indicator)', dataSource: 'art-record (currentStatus = Active)', updateFrequency: 'Monthly', department: 'HIV Program', category: 'HIV/ART' },
  { id: 'TX_PVLS_N', name: 'VL Suppression Numerator', definition: 'Number of ART clients with suppressed viral load (<1000 copies/mL)', numerator: 'Count of latest VL records with suppressionStatus = Suppressed', denominator: 'N/A', dataSource: 'viral-load (suppressionStatus)', updateFrequency: 'Quarterly', department: 'HIV Program', category: 'HIV/ART' },
  { id: 'TX_PVLS', name: 'VL Suppression Rate', definition: 'Proportion of ART clients with VL result who have suppressed VL', numerator: 'Clients with suppressed VL', denominator: 'Clients with any VL result', dataSource: 'viral-load', updateFrequency: 'Quarterly', department: 'HIV Program', category: 'HIV/ART' },
  { id: 'TX_RET', name: 'ART Retention Rate', definition: 'Proportion of clients retained on ART over time', numerator: 'Active ART clients', denominator: 'Total ever initiated on ART', dataSource: 'art-record', updateFrequency: 'Quarterly', department: 'HIV Program', category: 'HIV/ART' },

  // Harm Reduction
  { id: 'NSP_DIST', name: 'Syringes Distributed', definition: 'Total number of syringes distributed through NSP', numerator: 'Sum of syringesGiven across all NSP records', denominator: 'N/A (count indicator)', dataSource: 'nsp (syringesGiven)', updateFrequency: 'Daily', department: 'Harm Reduction', category: 'Harm Reduction' },
  { id: 'NSP_RET', name: 'NSP Return Rate', definition: 'Proportion of distributed syringes returned', numerator: 'Total syringes returned', denominator: 'Total syringes distributed', dataSource: 'nsp (syringesReturned / syringesGiven)', updateFrequency: 'Monthly', department: 'Harm Reduction', category: 'Harm Reduction' },
  { id: 'CONDOM_DIST', name: 'Condoms Distributed', definition: 'Total male and female condoms distributed', numerator: 'Sum of maleCondoms + femaleCondoms', denominator: 'N/A (count indicator)', dataSource: 'condom (maleCondoms, femaleCondoms)', updateFrequency: 'Daily', department: 'Harm Reduction', category: 'Harm Reduction' },
  { id: 'NALOXONE', name: 'Naloxone Kits', definition: 'Number of naloxone kits distributed for overdose prevention', numerator: 'Count of NSP records with naloxoneGiven = true', denominator: 'N/A (count indicator)', dataSource: 'nsp (naloxoneGiven)', updateFrequency: 'Monthly', department: 'Harm Reduction', category: 'Harm Reduction' },

  // MAT
  { id: 'MAT_ENROLL', name: 'MAT Enrollments', definition: 'Number of clients newly enrolled in MAT program', numerator: 'Count of unique clients with first MAT dosing record in period', denominator: 'N/A (count indicator)', dataSource: 'mat (first dosingDate per client)', updateFrequency: 'Monthly', department: 'MAT Program', category: 'MAT' },
  { id: 'MAT_RET', name: 'MAT Retention Rate', definition: 'Proportion of MAT clients retained at 6 months', numerator: 'Active MAT clients at 6 months', denominator: 'Total MAT enrollments 6+ months ago', dataSource: 'mat (dosingDate continuity)', updateFrequency: 'Quarterly', department: 'MAT Program', category: 'MAT' },
  { id: 'MAT_ACTIVE', name: 'Active MAT Clients', definition: 'Number of clients with MAT dosing in the last 30 days', numerator: 'Unique clients with recent MAT records', denominator: 'N/A (count indicator)', dataSource: 'mat (recent dosingDate)', updateFrequency: 'Monthly', department: 'MAT Program', category: 'MAT' },

  // Mental Health
  { id: 'PHQ9_SCREEN', name: 'PHQ-9 Screenings', definition: 'Number of PHQ-9 depression screenings administered', numerator: 'Count of mentalhealth records with PHQ-9 data', denominator: 'Total clients', dataSource: 'mentalhealth (type = PHQ-9)', updateFrequency: 'Monthly', department: 'Mental Health', category: 'Mental Health' },
  { id: 'PHQ9_IMPROVE', name: 'PHQ-9 Improvement Rate', definition: 'Proportion of clients showing PHQ-9 score improvement (<10)', numerator: 'Clients with latest PHQ-9 < 10', denominator: 'Total clients screened with PHQ-9', dataSource: 'mentalhealth (PHQ-9 scores)', updateFrequency: 'Quarterly', department: 'Mental Health', category: 'Mental Health' },
  { id: 'GAD7_SCREEN', name: 'GAD-7 Screenings', definition: 'Number of GAD-7 anxiety screenings administered', numerator: 'Count of mentalhealth records with GAD-7 data', denominator: 'Total clients', dataSource: 'mentalhealth (type = GAD-7)', updateFrequency: 'Monthly', department: 'Mental Health', category: 'Mental Health' },

  // Protection
  { id: 'GBV_SCREEN', name: 'GBV Screenings', definition: 'Number of gender-based violence screenings conducted', numerator: 'Count of paralegal case screenings', denominator: 'Total clients', dataSource: 'paralegal-case', updateFrequency: 'Monthly', department: 'Protection', category: 'Protection' },
  { id: 'GBV_RESOLVE', name: 'GBV Case Resolution Rate', definition: 'Proportion of GBV cases resolved', numerator: 'Cases with status = Resolved or Closed', denominator: 'Total cases opened', dataSource: 'paralegal-case (status)', updateFrequency: 'Quarterly', department: 'Protection', category: 'Protection' },

  // Program-wide
  { id: 'KP_REACHED', name: 'KP Reached', definition: 'Total unique key population members reached with any service', numerator: 'Count of unique client IDs with at least one visit', denominator: 'N/A (count indicator)', dataSource: 'visit (unique clientId)', updateFrequency: 'Monthly', department: 'Program', category: 'Program' },
  { id: 'SERVICE_CONTACTS', name: 'Total Service Contacts', definition: 'Total number of service delivery contacts across all programs', numerator: 'Count of all visits', denominator: 'N/A (count indicator)', dataSource: 'visit', updateFrequency: 'Daily', department: 'Program', category: 'Program' },
];

const CATEGORIES = ['All', 'Clinical', 'HIV/ART', 'Harm Reduction', 'MAT', 'Mental Health', 'Protection', 'Program'];

export function IndicatorDictionary({ currentUser }: IndicatorDictionaryProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return INDICATORS.filter(ind => {
      const matchesSearch = !search ||
        ind.name.toLowerCase().includes(search.toLowerCase()) ||
        ind.id.toLowerCase().includes(search.toLowerCase()) ||
        ind.definition.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || ind.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Indicator Dictionary</h2>
        <p className="text-sm text-gray-500">Complete reference of all M&E indicators with definitions and formulas</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <Input
            placeholder="Search indicators by name, code, or definition..."
            className="pl-9 h-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-gray-500">{filtered.length} indicators found</div>

      {/* Indicator Cards */}
      <div className="space-y-2">
        {filtered.map(ind => {
          const isExpanded = expandedId === ind.id;
          return (
            <Card
              key={ind.id}
              className={`border-0 shadow-sm cursor-pointer transition-all ${isExpanded ? 'ring-2 ring-gray-200' : 'hover:shadow-md'}`}
              onClick={() => setExpandedId(isExpanded ? null : ind.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-mono">{ind.id}</Badge>
                    <div>
                      <p className="font-semibold text-sm">{ind.name}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{ind.definition}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-100">{ind.category}</Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Definition</p>
                      <p className="text-sm">{ind.definition}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Numerator Formula</p>
                      <p className="text-sm font-mono bg-gray-50 p-2 rounded">{ind.numerator}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Denominator Formula</p>
                      <p className="text-sm font-mono bg-gray-50 p-2 rounded">{ind.denominator}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Data Source</p>
                      <p className="text-sm font-mono bg-blue-50 p-2 rounded text-blue-700">{ind.dataSource}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Update Frequency</p>
                      <Badge variant="outline" className="text-xs">{ind.updateFrequency}</Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Responsible Department</p>
                      <Badge className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-100">{ind.department}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
