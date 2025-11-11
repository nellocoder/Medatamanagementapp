import { projectId, publicAnonKey } from '../utils/supabase/info';

// Kenyan names data
const firstNamesMale = [
  'Mohammed', 'Hassan', 'Ali', 'Ahmed', 'Omar', 'Salim', 'Hamisi', 'Juma', 'Rashid', 'Abdalla',
  'Ibrahim', 'Ismael', 'Yusuf', 'Mwangi', 'Kamau', 'Otieno', 'Omondi', 'Wanjiru', 'Njoroge', 'Kipchoge',
  'David', 'John', 'Peter', 'James', 'Samuel', 'Daniel', 'Joseph', 'Michael', 'Patrick', 'Francis',
  'Kennedy', 'Brian', 'Victor', 'Dennis', 'Stephen', 'Kevin', 'Eric', 'Collins', 'Edwin', 'Felix'
];

const firstNamesFemale = [
  'Fatuma', 'Amina', 'Halima', 'Zainab', 'Maryam', 'Aisha', 'Khadija', 'Safia', 'Mariam', 'Rehema',
  'Wanjiku', 'Njeri', 'Akinyi', 'Awino', 'Chebet', 'Chemutai', 'Grace', 'Mary', 'Jane', 'Lucy',
  'Faith', 'Joyce', 'Rose', 'Catherine', 'Anne', 'Elizabeth', 'Margaret', 'Sarah', 'Ruth', 'Esther',
  'Beatrice', 'Agnes', 'Gladys', 'Susan', 'Alice', 'Nancy', 'Lydia', 'Eunice', 'Christine', 'Monica'
];

const lastNames = [
  'Abdallah', 'Mohammed', 'Hassan', 'Ali', 'Omar', 'Salim', 'Said', 'Hamisi', 'Bakari', 'Juma',
  'Kamau', 'Mwangi', 'Njoroge', 'Wanjiru', 'Otieno', 'Omondi', 'Ouma', 'Akinyi', 'Kipchoge', 'Rotich',
  'Maina', 'Kariuki', 'Mutua', 'Kimani', 'Ngugi', 'Ochieng', 'Wekesa', 'Chege', 'Kipruto', 'Korir',
  'Mwende', 'Ndungu', 'Barasa', 'Mutisya', 'Kibet', 'Koech', 'Nyambura', 'Wambui', 'Nyaga', 'Githinji'
];

const locations = {
  'Mombasa': ['Mvita', 'Changamwe', 'Jomvu', 'Kisauni', 'Nyali', 'Likoni', 'Old Town', 'Bamburi', 'Kongowea', 'Majengo'],
  'Lamu': ['Lamu Town', 'Shela', 'Matondoni', 'Kipungani', 'Faza', 'Kizingitini', 'Mkunumbi', 'Witu', 'Hindi', 'Mpeketoni'],
  'Kilifi': ['Kilifi Town', 'Malindi', 'Watamu', 'Gede', 'Mtwapa', 'Takaungu', 'Kaloleni', 'Rabai', 'Mariakani', 'Mnarani']
};

const educationLevels = ['No formal education', 'Primary incomplete', 'Primary complete', 'Secondary incomplete', 'Secondary complete', 'College/University', 'Vocational training'];
const employmentStatuses = ['Unemployed', 'Casual work', 'Self-employed', 'Formal employment', 'Student', 'Unable to work'];
const maritalStatuses = ['Single', 'Married', 'Divorced', 'Separated', 'Widowed', 'Cohabiting'];
const hivStatuses = ['Negative', 'Positive', 'Unknown'];
const hepStatuses = ['Negative', 'Positive', 'Unknown', 'Not tested'];
const tbStatuses = ['Negative', 'Presumptive TB', 'On treatment', 'Completed treatment'];
const injectionSites = ['Good', 'Fair', 'Abscess', 'Swelling', 'Infection', 'Scarring'];
const attendancePatterns = ['Regular', 'Irregular', 'Missed doses', 'Daily pickup'];
const stimulants = ['Khat', 'Muguka', 'Cocaine', 'Methamphetamine', 'Prescription pills', 'MDMA'];
const frequencies = ['Daily', 'Several times a week', 'Weekly', 'Occasionally', 'Binge pattern'];
const followUpStatuses = ['Active', 'Completed', 'Pending', 'Lost to follow up', 'Transferred'];
const flags = ['High risk', 'Vulnerable', 'Stable', 'New enrollment', 'Needs follow-up'];
const outreachWorkers = ['Jane Kamau', 'Hassan Omar', 'Mary Ochieng', 'Ahmed Said', 'Grace Mwangi', 'Salim Hassan', 'Faith Akinyi', 'Mohammed Ali'];

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[random(0, array.length - 1)];
}

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function generatePhoneNumber(): string {
  const prefixes = ['0700', '0701', '0710', '0711', '0720', '0721', '0722', '0733', '0734', '0740'];
  return `${randomChoice(prefixes)}${random(100000, 999999)}`;
}

function generateIDNumber(): string {
  return `${random(10000000, 39999999)}`;
}

function generateClientID(index: number, program: string): string {
  const prefix = program === 'NSP' ? 'NSP' : program === 'Methadone' ? 'MAT' : 'STP';
  return `${prefix}-${String(index).padStart(4, '0')}`;
}

function generateBMI(weight: number): number {
  const height = random(150, 185) / 100; // Convert cm to m
  return parseFloat((weight / (height * height)).toFixed(1));
}

export function generateClients() {
  const clients = [];
  let clientIndex = 1;

  // Generate 30 NSP clients
  for (let i = 0; i < 30; i++) {
    const gender = randomChoice(['Male', 'Female']);
    const firstName = gender === 'Male' ? randomChoice(firstNamesMale) : randomChoice(firstNamesFemale);
    const lastName = randomChoice(lastNames);
    const county = randomChoice(Object.keys(locations));
    const subLocation = randomChoice(locations[county as keyof typeof locations]);
    const weight = random(45, 95);
    const registrationDate = randomDate(new Date(2023, 0, 1), new Date(2024, 10, 1));

    const client = {
      clientId: generateClientID(clientIndex++, 'NSP'),
      firstName,
      lastName,
      age: random(18, 55),
      gender,
      location: county,
      subLocation,
      phone: generatePhoneNumber(),
      email: '',
      idNumber: generateIDNumber(),
      address: `${subLocation}, ${county}`,
      
      // Demographics
      educationLevel: randomChoice(educationLevels),
      employmentStatus: randomChoice(employmentStatuses),
      maritalStatus: randomChoice(maritalStatuses),
      
      // Clinical data
      hivStatus: randomChoice(hivStatuses),
      hepBStatus: randomChoice(hepStatuses),
      hepCStatus: randomChoice(hepStatuses),
      tbStatus: randomChoice(tbStatuses),
      bloodPressure: `${random(90, 150)}/${random(60, 95)}`,
      pulseRate: random(60, 100),
      weight,
      bmi: generateBMI(weight),
      phq9Score: random(0, 27),
      gad7Score: random(0, 21),
      assistScore: random(10, 39),
      
      // Program
      program: 'NSP',
      
      // NSP-specific
      needlesReceived: random(10, 100),
      needlesReturned: random(5, 95),
      injectionFrequency: randomChoice(['Daily', '2-3 times/day', 'Several times/week', 'Weekly']),
      injectionSiteHealth: randomChoice(injectionSites),
      riskBehaviorHistory: randomChoice(['High', 'Moderate', 'Low']),
      overdoseHistory: randomChoice(['Yes', 'No', 'Unknown']),
      counsellingSessionsAttended: random(0, 20),
      
      // Interventions
      hivTesting: randomChoice(['Yes', 'No']),
      stiScreening: randomChoice(['Yes', 'No']),
      srhCounselling: randomChoice(['Yes', 'No']),
      prepLinkage: randomChoice(['Yes', 'No', 'Not eligible']),
      condomsDistributed: random(0, 50),
      gbvScreening: randomChoice(['Yes', 'No']),
      harmReductionCounselling: randomChoice(['Yes', 'No']),
      nutritionAssessment: randomChoice(['Yes', 'No']),
      mentalHealthCounselling: randomChoice(['Yes', 'No']),
      caseManagementSessions: random(0, 15),
      followUpVisits: random(1, 12),
      communityOutreachContacts: random(0, 8),
      
      // Administrative
      registrationDate,
      outreachWorker: randomChoice(outreachWorkers),
      followUpStatus: randomChoice(followUpStatuses),
      flags: randomChoice(flags),
      notes: 'NSP client - ' + randomChoice(['Engaged in services', 'Requires follow-up', 'Showing improvement', 'Needs additional support']),
      
      status: 'Active'
    };
    
    clients.push(client);
  }

  // Generate 30 Methadone/MAT clients
  for (let i = 0; i < 30; i++) {
    const gender = randomChoice(['Male', 'Female']);
    const firstName = gender === 'Male' ? randomChoice(firstNamesMale) : randomChoice(firstNamesFemale);
    const lastName = randomChoice(lastNames);
    const county = randomChoice(Object.keys(locations));
    const subLocation = randomChoice(locations[county as keyof typeof locations]);
    const weight = random(45, 95);
    const registrationDate = randomDate(new Date(2023, 0, 1), new Date(2024, 10, 1));
    const inductionDate = randomDate(new Date(2023, 0, 1), new Date(2024, 10, 1));

    const client = {
      clientId: generateClientID(clientIndex++, 'Methadone'),
      firstName,
      lastName,
      age: random(22, 60),
      gender,
      location: county,
      subLocation,
      phone: generatePhoneNumber(),
      email: '',
      idNumber: generateIDNumber(),
      address: `${subLocation}, ${county}`,
      
      // Demographics
      educationLevel: randomChoice(educationLevels),
      employmentStatus: randomChoice(employmentStatuses),
      maritalStatus: randomChoice(maritalStatuses),
      
      // Clinical data
      hivStatus: randomChoice(hivStatuses),
      hepBStatus: randomChoice(hepStatuses),
      hepCStatus: randomChoice(hepStatuses),
      tbStatus: randomChoice(tbStatuses),
      bloodPressure: `${random(90, 150)}/${random(60, 95)}`,
      pulseRate: random(60, 100),
      weight,
      bmi: generateBMI(weight),
      phq9Score: random(0, 27),
      gad7Score: random(0, 21),
      assistScore: random(15, 39),
      
      // Program
      program: 'Methadone (MAT)',
      
      // Methadone-specific
      inductionDate,
      dailyMethadoneDose: random(30, 150),
      doseAdjustments: random(0, 8),
      takeHomeEligibility: randomChoice(['Yes', 'No', 'Under evaluation']),
      urineToxicology: randomChoice(['Negative', 'Positive for opiates', 'Positive for cannabis', 'Positive for benzos', 'Not done']),
      attendancePattern: randomChoice(attendancePatterns),
      coOccurringSubstanceUse: randomChoice(['None', 'Cannabis', 'Alcohol', 'Benzodiazepines', 'Multiple']),
      psychosocialSupport: randomChoice(['Yes', 'No', 'Pending']),
      
      // Interventions
      hivTesting: randomChoice(['Yes', 'No']),
      stiScreening: randomChoice(['Yes', 'No']),
      srhCounselling: randomChoice(['Yes', 'No']),
      prepLinkage: randomChoice(['Yes', 'No', 'Not eligible']),
      condomsDistributed: random(0, 50),
      gbvScreening: randomChoice(['Yes', 'No']),
      harmReductionCounselling: randomChoice(['Yes', 'No']),
      nutritionAssessment: randomChoice(['Yes', 'No']),
      mentalHealthCounselling: randomChoice(['Yes', 'No']),
      caseManagementSessions: random(0, 15),
      followUpVisits: random(1, 12),
      communityOutreachContacts: random(0, 8),
      
      // Administrative
      registrationDate,
      outreachWorker: randomChoice(outreachWorkers),
      followUpStatus: randomChoice(followUpStatuses),
      flags: randomChoice(flags),
      notes: 'MAT client - ' + randomChoice(['Stable on methadone', 'Dose titration ongoing', 'Good attendance', 'Requires counselling support']),
      
      status: 'Active'
    };
    
    clients.push(client);
  }

  // Generate 40 Stimulant Users Program clients
  for (let i = 0; i < 40; i++) {
    const gender = randomChoice(['Male', 'Female']);
    const firstName = gender === 'Male' ? randomChoice(firstNamesMale) : randomChoice(firstNamesFemale);
    const lastName = randomChoice(lastNames);
    const county = randomChoice(Object.keys(locations));
    const subLocation = randomChoice(locations[county as keyof typeof locations]);
    const weight = random(45, 95);
    const registrationDate = randomDate(new Date(2023, 0, 1), new Date(2024, 10, 1));

    const client = {
      clientId: generateClientID(clientIndex++, 'Stimulant'),
      firstName,
      lastName,
      age: random(18, 50),
      gender,
      location: county,
      subLocation,
      phone: generatePhoneNumber(),
      email: '',
      idNumber: generateIDNumber(),
      address: `${subLocation}, ${county}`,
      
      // Demographics
      educationLevel: randomChoice(educationLevels),
      employmentStatus: randomChoice(employmentStatuses),
      maritalStatus: randomChoice(maritalStatuses),
      
      // Clinical data
      hivStatus: randomChoice(hivStatuses),
      hepBStatus: randomChoice(hepStatuses),
      hepCStatus: randomChoice(hepStatuses),
      tbStatus: randomChoice(tbStatuses),
      bloodPressure: `${random(90, 150)}/${random(60, 95)}`,
      pulseRate: random(60, 110),
      weight,
      bmi: generateBMI(weight),
      phq9Score: random(0, 27),
      gad7Score: random(0, 21),
      assistScore: random(8, 35),
      
      // Program
      program: 'Stimulant Users Program',
      
      // Stimulant-specific
      primaryStimulant: randomChoice(stimulants),
      stimulantUseFrequency: randomChoice(frequencies),
      socialMediaInfluence: randomChoice(['Yes', 'No', 'Uncertain']),
      sexualRiskBehavior: randomChoice(['Yes', 'No', 'Declined to answer']),
      chemsexIndicators: randomChoice(['Yes', 'No', 'Not assessed']),
      motivationForUse: randomChoice(['Social', 'Work performance', 'Recreation', 'Coping', 'Multiple reasons']),
      mentalHealthSymptoms: randomChoice(['Depression', 'Anxiety', 'Both', 'None', 'Psychosis']),
      cbtSessionsAttended: random(0, 12),
      vocationalTrainingStatus: randomChoice(['Enrolled', 'Completed', 'Not enrolled', 'Pending']),
      peerSupportInvolvement: randomChoice(['Active', 'Inactive', 'Not enrolled']),
      
      // Interventions
      hivTesting: randomChoice(['Yes', 'No']),
      stiScreening: randomChoice(['Yes', 'No']),
      srhCounselling: randomChoice(['Yes', 'No']),
      prepLinkage: randomChoice(['Yes', 'No', 'Not eligible']),
      condomsDistributed: random(0, 50),
      gbvScreening: randomChoice(['Yes', 'No']),
      harmReductionCounselling: randomChoice(['Yes', 'No']),
      nutritionAssessment: randomChoice(['Yes', 'No']),
      mentalHealthCounselling: randomChoice(['Yes', 'No']),
      caseManagementSessions: random(0, 15),
      followUpVisits: random(1, 12),
      communityOutreachContacts: random(0, 8),
      
      // Administrative
      registrationDate,
      outreachWorker: randomChoice(outreachWorkers),
      followUpStatus: randomChoice(followUpStatuses),
      flags: randomChoice(flags),
      notes: 'Stimulant program client - ' + randomChoice(['Engaged in CBT', 'Exploring vocational options', 'Active in peer support', 'Needs intensive support']),
      
      status: 'Active'
    };
    
    clients.push(client);
  }

  return clients;
}

export async function uploadClients(clients: any[], currentUserId: string) {
  let successCount = 0;
  let failCount = 0;

  for (const client of clients) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ client, userId: currentUserId }),
        }
      );

      const data = await response.json();
      if (data.success) {
        successCount++;
      } else {
        failCount++;
        console.error('Failed to upload client:', client.clientId, data.error);
      }
    } catch (error) {
      failCount++;
      console.error('Error uploading client:', client.clientId, error);
    }
  }

  return { successCount, failCount, total: clients.length };
}