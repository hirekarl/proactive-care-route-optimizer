export interface ElevatorAdvocateBoroughStat {
  name: string;
  count: number;
  pct: number;
}

export interface ElevatorAdvocateTopBuilding {
  address: string;
  borough: string;
  count: number;
  bin: string;
  councilDistrict: string;
  repName: string;
  lat: number;
  lng: number;
  lossOfService30d: number;
  riskScore: number;
  riskConfidence: number;
}

export interface ElevatorAdvocateMonthlyStat {
  month: string;
  count: number;
}

export const elevatorAdvocateStats = {
  sourceLabel: "Elevator Advocate",
  sourceUrl: "https://elevatoradvocate.nyc/data",
  apiUrl: "https://api.elevatoradvocate.nyc/api/buildings/city-stats/",
  snapshotDate: "2026-06-30",
  coverage: "NYC DOB 6S/6M elevator complaints, 2018-2026",
  totalComplaints12mo: 14106,
  seasonalSpikeMonth: "July",
  seasonalSpikePct: 35,
  boroughBreakdown: [
    { name: "Bronx", count: 4159, pct: 29.5 },
    { name: "Manhattan", count: 3949, pct: 28 },
    { name: "Brooklyn", count: 3693, pct: 26.2 },
    { name: "Queens", count: 2178, pct: 15.4 },
    { name: "Staten Island", count: 122, pct: 0.9 },
  ],
  topBuildings: [
    {
      address: "80 EAST 93 STREET",
      borough: "Brooklyn",
      count: 35,
      bin: "3346868",
      councilDistrict: "41",
      repName: "Darlene Mealy",
      lat: 40.663057,
      lng: -73.927764,
      lossOfService30d: 0,
      riskScore: 40,
      riskConfidence: 100,
    },
    {
      address: "60 EAST 93 STREET",
      borough: "Brooklyn",
      count: 28,
      bin: "3346866",
      councilDistrict: "41",
      repName: "Darlene Mealy",
      lat: 40.663129,
      lng: -73.92824,
      lossOfService30d: 0,
      riskScore: 40,
      riskConfidence: 100,
    },
    {
      address: "5 EAST 93 STREET",
      borough: "Brooklyn",
      count: 27,
      bin: "3346863",
      councilDistrict: "41",
      repName: "Darlene Mealy",
      lat: 40.663749,
      lng: -73.928268,
      lossOfService30d: 0,
      riskScore: 40,
      riskConfidence: 100,
    },
    {
      address: "150 LEFFERTS AVENUE",
      borough: "Brooklyn",
      count: 24,
      bin: "3035257",
      councilDistrict: "35",
      repName: "Crystal Hudson",
      lat: 40.661679,
      lng: -73.956128,
      lossOfService30d: 0,
      riskScore: 8.33,
      riskConfidence: 10,
    },
    {
      address: "3990 BRONX BOULEVARD",
      borough: "Bronx",
      count: 23,
      bin: "2062854",
      councilDistrict: "12",
      repName: "Kevin C. Riley",
      lat: 40.88925,
      lng: -73.863755,
      lossOfService30d: 0,
      riskScore: 16.67,
      riskConfidence: 20,
    },
    {
      address: "390 EAST 158 STREET",
      borough: "Bronx",
      count: 21,
      bin: "2117805",
      councilDistrict: "17",
      repName: "Justin Sanchez",
      lat: 40.822275,
      lng: -73.915318,
      lossOfService30d: 0.28,
      riskScore: 25,
      riskConfidence: 30,
    },
    {
      address: "341 EAST 162 STREET",
      borough: "Bronx",
      count: 20,
      bin: "2129469",
      councilDistrict: "16",
      repName: "Althea Stevens",
      lat: 40.82556,
      lng: -73.91471,
      lossOfService30d: 0,
      riskScore: 8.33,
      riskConfidence: 10,
    },
    {
      address: "100 EAST 93 STREET",
      borough: "Brooklyn",
      count: 19,
      bin: "3346864",
      councilDistrict: "41",
      repName: "Darlene Mealy",
      lat: 40.662597,
      lng: -73.927442,
      lossOfService30d: 0.28,
      riskScore: 40,
      riskConfidence: 100,
    },
    {
      address: "120 WEST 97 STREET",
      borough: "Manhattan",
      count: 19,
      bin: "1085591",
      councilDistrict: "7",
      repName: "Shaun Abreu",
      lat: 40.793909,
      lng: -73.968419,
      lossOfService30d: 0,
      riskScore: 40,
      riskConfidence: 50,
    },
    {
      address: "441 EAST 116 STREET",
      borough: "Manhattan",
      count: 18,
      bin: "1053082",
      councilDistrict: "8",
      repName: "Elsie Encarnacion",
      lat: 40.79557,
      lng: -73.933707,
      lossOfService30d: 0,
      riskScore: 40,
      riskConfidence: 50,
    },
    {
      address: "35-64 84 STREET",
      borough: "Queens",
      count: 18,
      bin: "4035828",
      councilDistrict: "25",
      repName: "Shekar Krishnan",
      lat: 40.750189,
      lng: -73.883113,
      lossOfService30d: 0,
      riskScore: 16.67,
      riskConfidence: 20,
    },
    {
      address: "3873 ORLOFF AVENUE",
      borough: "Bronx",
      count: 17,
      bin: "2016025",
      councilDistrict: "11",
      repName: "Eric Dinowitz",
      lat: 40.884485,
      lng: -73.896184,
      lossOfService30d: 0,
      riskScore: 40,
      riskConfidence: 100,
    },
    {
      address: "1325 JEROME AVENUE",
      borough: "Bronx",
      count: 17,
      bin: "2129224",
      councilDistrict: "16",
      repName: "Althea Stevens",
      lat: 40.83862,
      lng: -73.919275,
      lossOfService30d: 0,
      riskScore: 16.67,
      riskConfidence: 20,
    },
    {
      address: "315 EAST 102 STREET",
      borough: "Manhattan",
      count: 17,
      bin: "1088305",
      councilDistrict: "8",
      repName: "Elsie Encarnacion",
      lat: 40.78784,
      lng: -73.943251,
      lossOfService30d: 0,
      riskScore: 40,
      riskConfidence: 90,
    },
    {
      address: "2240 WALTON AVENUE",
      borough: "Bronx",
      count: 15,
      bin: "2088408",
      councilDistrict: "14",
      repName: "Pierina Ana Sanchez",
      lat: 40.85728,
      lng: -73.903159,
      lossOfService30d: 0,
      riskScore: 16.67,
      riskConfidence: 20,
    },
  ],
  monthlyCurrentYear: [
    { month: "Jan", count: 841 },
    { month: "Feb", count: 945 },
    { month: "Mar", count: 813 },
    { month: "Apr", count: 859 },
    { month: "May", count: 886 },
    { month: "Jun", count: 1072 },
  ],
} satisfies {
  sourceLabel: string;
  sourceUrl: string;
  apiUrl: string;
  snapshotDate: string;
  coverage: string;
  totalComplaints12mo: number;
  seasonalSpikeMonth: string;
  seasonalSpikePct: number;
  boroughBreakdown: ElevatorAdvocateBoroughStat[];
  topBuildings: ElevatorAdvocateTopBuilding[];
  monthlyCurrentYear: ElevatorAdvocateMonthlyStat[];
};
