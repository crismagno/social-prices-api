export interface ICountryMockData {
  name: string;
  code: string;
}

export interface IStateMockData {
  name: string;
  code: string;
}

export interface ICityMockData {
  stateName: string;
  stateCode: string;
  cities: string[];
}
