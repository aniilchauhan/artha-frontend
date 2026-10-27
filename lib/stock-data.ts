import type { QuoteProvenance } from './market-quote';
export interface HistoricalPrice {
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type StockHistory = HistoricalPrice;

export interface Stock extends Partial<QuoteProvenance> {
  ticker: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  history: StockHistory[];
  isFallback?: boolean;
  sector?: string;
  marketCap?: number; // in ₹ Crores
}

export const STOCK_METADATA: Record<string, { sector: string; marketCap: number }> = {
  RELIANCE: { sector: "Conglomerate & Energy", marketCap: 1980000 },
  TCS: { sector: "Technology", marketCap: 1420000 },
  HDFCBANK: { sector: "Banking & Finance", marketCap: 1280000 },
  INFY: { sector: "Technology", marketCap: 640000 },
  ICICIBANK: { sector: "Banking & Finance", marketCap: 830000 },
  ITC: { sector: "FMCG & Retail", marketCap: 530000 },
  SBIN: { sector: "Banking & Finance", marketCap: 730000 },
  BHARTIARTL: { sector: "Telecom & Networking", marketCap: 820000 },
  LTIM: { sector: "Technology", marketCap: 152000 },
  LT: { sector: "Infrastructure & Heavy Engineering", marketCap: 480000 },
  KOTAKBANK: { sector: "Banking & Finance", marketCap: 350000 },
  HINDUNILVR: { sector: "FMCG & Retail", marketCap: 570000 },
  MARUTI: { sector: "Automotive", marketCap: 380000 },
  TATASTEEL: { sector: "Metals & Mining", marketCap: 210000 },
  WIPRO: { sector: "Technology", marketCap: 250000 },
  AXISBANK: { sector: "Banking & Finance", marketCap: 360000 },
  ASIANPAINT: { sector: "Chemicals & Paints", marketCap: 270000 },
  "M&M": { sector: "Automotive & Conglomerate", marketCap: 340000 },
  BAJFINANCE: { sector: "Banking & Finance", marketCap: 420000 },
  SUNPHARMA: { sector: "Healthcare & Pharma", marketCap: 360000 },
  ADANIENT: { sector: "Conglomerate & Infra", marketCap: 350000 },
  NTPC: { sector: "Utilities & Energy", marketCap: 360000 },
  ONGC: { sector: "Utilities & Energy", marketCap: 330000 },
  TITAN: { sector: "FMCG & Retail", marketCap: 290000 },
  TATAMOTORS: { sector: "Automotive", marketCap: 340000 },
  ETERNAL: { sector: "Diversified Products", marketCap: 12400 },
  AVENUESAI: { sector: "Technology & AI Services", marketCap: 8400 },
  IRCON: { sector: "Infrastructure & Heavy Engineering", marketCap: 25400 },
  PFS: { sector: "Banking & Finance", marketCap: 2900 },
  IRFC: { sector: "Banking & Finance", marketCap: 228000 },
  SUZLON: { sector: "Utilities & Energy", marketCap: 88000 },
  SWIGGY: { sector: "Consumer Services & Tech", marketCap: 95000 },
  JSWCEMENT: { sector: "Cement & Building Materials", marketCap: 18500 },
  IGI: { sector: "FMCG & Retail", marketCap: 15400 },
  DLINK: { sector: "Telecom & Networking", marketCap: 1400 },
  ITCHOTELS: { sector: "Hospitality & Tourism", marketCap: 24500 },
  TMPV: { sector: "Automotive", marketCap: 11000 },
  ATHER: { sector: "Automotive", marketCap: 9800 },
  RBA: { sector: "Consumer Services & Tech", marketCap: 5200 },
  DEEPAKBUILD: { sector: "Infrastructure & Heavy Engineering", marketCap: 2100 },
  GROWW: { sector: "Banking & Finance", marketCap: 25000 },
  AFCONS: { sector: "Infrastructure & Heavy Engineering", marketCap: 18400 },
  HIGHWAY: { sector: "Infrastructure & Heavy Engineering", marketCap: 9800 },
  ABCAPITAL: { sector: "Banking & Finance", marketCap: 54000 },
  GOPAL: { sector: "FMCG & Retail", marketCap: 4200 },
  JIOFIN: { sector: "Banking & Finance", marketCap: 220000 },
  OLAELEC: { sector: "Automotive", marketCap: 34000 },
  INFOBEAN: { sector: "Technology", marketCap: 1200 },
  ADITYAINFO: { sector: "Technology & AI Services", marketCap: 1100 },
  NSDL: { sector: "Banking & Finance", marketCap: 41000 },
  GNGELEC: { sector: "Consumer Services & Tech", marketCap: 900 },
  VISHAL: { sector: "FMCG & Retail", marketCap: 154000 },
  ENVIROINFRA: { sector: "Infrastructure & Heavy Engineering", marketCap: 2100 },
  ANTHEM: { sector: "Healthcare & Pharma", marketCap: 18200 },
  SALASAR: { sector: "Infrastructure & Heavy Engineering", marketCap: 6800 },
  SHANTIGOLD: { sector: "FMCG & Retail", marketCap: 1200 },
  MEESHO: { sector: "Consumer Services & Tech", marketCap: 42000 },
  ANANTRAJ: { sector: "Real Estate", marketCap: 14500 },
  JUPITERWAG: { sector: "Infrastructure & Heavy Engineering", marketCap: 25500 },
  RPOWER: { sector: "Utilities & Energy", marketCap: 12000 },
  NHPC: { sector: "Utilities & Energy", marketCap: 102000 },
  IOB: { sector: "Banking & Finance", marketCap: 122000 },
  GTLINFRA: { sector: "Telecom & Networking", marketCap: 3200 },
  PNB: { sector: "Banking & Finance", marketCap: 138000 },
  ACMESOLAR: { sector: "Utilities & Energy", marketCap: 14500 },
  PREMIERENE: { sector: "Utilities & Energy", marketCap: 49000 },
  ABSLAMC: { sector: "Banking & Finance", marketCap: 17800 },
  CANBK: { sector: "Banking & Finance", marketCap: 107000 },
  IDEA: { sector: "Telecom & Networking", marketCap: 82000 },
  DEVYANI: { sector: "Consumer Services & Tech", marketCap: 20400 },
  TATAPOWER: { sector: "Utilities & Energy", marketCap: 140000 },
  RVNL: { sector: "Infrastructure & Heavy Engineering", marketCap: 85000 },
  CUPID: { sector: "Healthcare & Pharma", marketCap: 1100 },
  MOREPENLAB: { sector: "Healthcare & Pharma", marketCap: 2500 }
};

export const INITIAL_STOCKS: Stock[] = [
  {
    ticker: "CUPID",
    name: "Cupid Ltd.",
    currentPrice: 314.05,
    change: -22.25,
    changePercent: -6.62,
    high: 318.5,
    low: 302.55,
    volume: 15195694,
    history: generateInitialHistory(314.05)
  },
  {
    ticker: "MOREPENLAB",
    name: "Morepen Laboratories Ltd.",
    currentPrice: 126.01,
    change: 4.52,
    changePercent: 3.72,
    high: 128,
    low: 119.01,
    volume: 4026475,
    history: generateInitialHistory(126.01)
  },
  {
    ticker: "RELIANCE",
    name: "Reliance Industries Ltd.",
    currentPrice: 1201.8,
    change: -0.2,
    changePercent: -0.02,
    high: 1204.5,
    low: 1174.5,
    volume: 7488472,
    history: generateInitialHistory(1201.8)
  },
  {
    ticker: "TCS",
    name: "Tata Consultancy Services Ltd.",
    currentPrice: 2535,
    change: 74.1,
    changePercent: 3.01,
    high: 2549.7,
    low: 2491.6,
    volume: 4325477,
    history: generateInitialHistory(2535)
  },
  {
    ticker: "HDFCBANK",
    name: "HDFC Bank Ltd.",
    currentPrice: 688.05,
    change: -23.95,
    changePercent: -3.36,
    high: 693.8,
    low: 684,
    volume: 23485616,
    history: generateInitialHistory(688.05)
  },
  {
    ticker: "INFY",
    name: "Infosys Ltd.",
    currentPrice: 1166,
    change: 35.3,
    changePercent: 3.12,
    high: 1166,
    low: 1107,
    volume: 25961107,
    history: generateInitialHistory(1166)
  },
  {
    ticker: "ICICIBANK",
    name: "ICICI Bank Ltd.",
    currentPrice: 1403,
    change: 22,
    changePercent: 1.59,
    high: 1403.9,
    low: 1378.7,
    volume: 7935332,
    history: generateInitialHistory(1403)
  },
  {
    ticker: "ITC",
    name: "ITC Ltd.",
    currentPrice: 260.5,
    change: -0.3,
    changePercent: -0.12,
    high: 260.5,
    low: 254.3,
    volume: 15093979,
    history: generateInitialHistory(260.5)
  },
  {
    ticker: "SBIN",
    name: "State Bank of India",
    currentPrice: 960.8,
    change: -12.9,
    changePercent: -1.32,
    high: 961.55,
    low: 943.4,
    volume: 6676961,
    history: generateInitialHistory(960.8)
  },
  {
    ticker: "BHARTIARTL",
    name: "Bharti Airtel Ltd.",
    currentPrice: 1917.5,
    change: 42.3,
    changePercent: 2.26,
    high: 1917.5,
    low: 1874.5,
    volume: 2993332,
    history: generateInitialHistory(1917.5)
  },
  {
    ticker: "LTIM",
    name: "LTIMindtree Ltd.",
    currentPrice: 4074.9,
    change: -190,
    changePercent: -4.45,
    high: 4149.7,
    low: 4040.1,
    volume: 401564,
    history: generateInitialHistory(4074.9)
  },
  {
    ticker: "LT",
    name: "Larsen & Toubro Ltd.",
    currentPrice: 3680,
    change: 18.1,
    changePercent: 0.49,
    high: 3684,
    low: 3615.1,
    volume: 1144196,
    history: generateInitialHistory(3680)
  },
  {
    ticker: "KOTAKBANK",
    name: "Kotak Mahindra Bank Ltd.",
    currentPrice: 440.75,
    change: -1.55,
    changePercent: -0.35,
    high: 446.3,
    low: 437.6,
    volume: 32584687,
    history: generateInitialHistory(440.75)
  },
  {
    ticker: "HINDUNILVR",
    name: "Hindustan Unilever Ltd.",
    currentPrice: 1818.6,
    change: -34.6,
    changePercent: -1.87,
    high: 1818.6,
    low: 1783.2,
    volume: 671790,
    history: generateInitialHistory(1818.6)
  },
  {
    ticker: "MARUTI",
    name: "Maruti Suzuki India Ltd.",
    currentPrice: 11220,
    change: -255,
    changePercent: -2.22,
    high: 11299,
    low: 11102,
    volume: 489181,
    history: generateInitialHistory(11220)
  },
  {
    ticker: "TATASTEEL",
    name: "Tata Steel Ltd.",
    currentPrice: 169.94,
    change: -4.1,
    changePercent: -2.36,
    high: 169.94,
    low: 165.51,
    volume: 22617261,
    history: generateInitialHistory(169.94)
  },
  {
    ticker: "WIPRO",
    name: "Wipro Ltd.",
    currentPrice: 189.2,
    change: 7.06,
    changePercent: 3.88,
    high: 189.7,
    low: 185.31,
    volume: 11397732,
    history: generateInitialHistory(189.2)
  },
  {
    ticker: "AXISBANK",
    name: "Axis Bank Ltd.",
    currentPrice: 1220,
    change: -16,
    changePercent: -1.29,
    high: 1228,
    low: 1210.1,
    volume: 7825730,
    history: generateInitialHistory(1220)
  },
  {
    ticker: "ASIANPAINT",
    name: "Asian Paints Ltd.",
    currentPrice: 2322,
    change: -8.7,
    changePercent: -0.37,
    high: 2322,
    low: 2233.5,
    volume: 845531,
    history: generateInitialHistory(2322)
  },
  {
    ticker: "M&M",
    name: "Mahindra & Mahindra Ltd.",
    currentPrice: 2853.1,
    change: -53.9,
    changePercent: -1.85,
    high: 2882,
    low: 2816.4,
    volume: 1681311,
    history: generateInitialHistory(2853.1)
  },
  {
    ticker: "BAJFINANCE",
    name: "Bajaj Finance Ltd.",
    currentPrice: 918.7,
    change: -38.65,
    changePercent: -4.04,
    high: 926.7,
    low: 906.2,
    volume: 3976376,
    history: generateInitialHistory(918.7)
  },
  {
    ticker: "SUNPHARMA",
    name: "Sun Pharmaceutical Industries Ltd.",
    currentPrice: 1740,
    change: -3,
    changePercent: -0.17,
    high: 1766,
    low: 1729.4,
    volume: 1622460,
    history: generateInitialHistory(1740)
  },
  {
    ticker: "ADANIENT",
    name: "Adani Enterprises Ltd.",
    currentPrice: 2508,
    change: -149.5,
    changePercent: -5.63,
    high: 2512.9,
    low: 2446.9,
    volume: 1438615,
    history: generateInitialHistory(2508)
  },
  {
    ticker: "NTPC",
    name: "NTPC Ltd.",
    currentPrice: 300,
    change: -9,
    changePercent: -2.91,
    high: 301.4,
    low: 294.1,
    volume: 6214634,
    history: generateInitialHistory(300)
  },
  {
    ticker: "ONGC",
    name: "Oil & Natural Gas Corporation Ltd.",
    currentPrice: 228.44,
    change: 3.44,
    changePercent: 1.53,
    high: 228.9,
    low: 224.66,
    volume: 6375263,
    history: generateInitialHistory(228.44)
  },
  {
    ticker: "TITAN",
    name: "Titan Company Ltd.",
    currentPrice: 4323,
    change: -101.2,
    changePercent: -2.29,
    high: 4327.6,
    low: 4240.8,
    volume: 382342,
    history: generateInitialHistory(4323)
  },
  {
    ticker: "TATAMOTORS",
    name: "Tata Motors Ltd.",
    currentPrice: 263.7,
    change: -14.3,
    changePercent: -5.14,
    high: 264.65,
    low: 259.4,
    volume: 8760167,
    history: generateInitialHistory(263.7)
  },
  {
    ticker: "ETERNAL",
    name: "Eternal Industries Ltd.",
    currentPrice: 325.55,
    change: 5.35,
    changePercent: 1.67,
    high: 327.95,
    low: 313.65,
    volume: 32167376,
    history: generateInitialHistory(325.55)
  },
  {
    ticker: "AVENUESAI",
    name: "AvenuesAI Ltd.",
    currentPrice: 119.81,
    change: -10.24,
    changePercent: -7.87,
    high: 121.31,
    low: 113.81,
    volume: 1260961,
    history: generateInitialHistory(119.81)
  },
  {
    ticker: "IRCON",
    name: "Ircon International Ltd.",
    currentPrice: 97.58,
    change: -6.56,
    changePercent: -6.3,
    high: 99.48,
    low: 95.76,
    volume: 1969345,
    history: generateInitialHistory(97.58)
  },
  {
    ticker: "PFS",
    name: "PTC India Financial Services Ltd.",
    currentPrice: 24.39,
    change: -1.8,
    changePercent: -6.87,
    high: 24.81,
    low: 23.88,
    volume: 653516,
    history: generateInitialHistory(24.39)
  },
  {
    ticker: "IRFC",
    name: "Indian Railway Finance Corporation Ltd.",
    currentPrice: 74.4,
    change: -4.04,
    changePercent: -5.15,
    high: 75.35,
    low: 73.14,
    volume: 10937611,
    history: generateInitialHistory(74.4)
  },
  {
    ticker: "SUZLON",
    name: "Suzlon Energy Ltd.",
    currentPrice: 37.12,
    change: -3.26,
    changePercent: -8.07,
    high: 37.37,
    low: 36.56,
    volume: 79609949,
    history: generateInitialHistory(37.12)
  },
  {
    ticker: "SWIGGY",
    name: "Swiggy Ltd.",
    currentPrice: 185.75,
    change: -43.25,
    changePercent: -18.89,
    high: 191.55,
    low: 174.2,
    volume: 56506204,
    history: generateInitialHistory(185.75)
  },
  {
    ticker: "JSWCEMENT",
    name: "JSW Cement Ltd.",
    currentPrice: 117.6,
    change: 1.88,
    changePercent: 1.62,
    high: 118.35,
    low: 116,
    volume: 1189386,
    history: generateInitialHistory(117.6)
  },
  {
    ticker: "IGI",
    name: "International Gemological Institute Ltd.",
    currentPrice: 385.3,
    change: 63.35,
    changePercent: 19.68,
    high: 391.5,
    low: 368.4,
    volume: 4080339,
    history: generateInitialHistory(385.3)
  },
  {
    ticker: "DLINK",
    name: "D-Link (India) Ltd.",
    currentPrice: 394.85,
    change: -18.5,
    changePercent: -4.48,
    high: 396.7,
    low: 385,
    volume: 41665,
    history: generateInitialHistory(394.85)
  },
  {
    ticker: "ITCHOTELS",
    name: "ITC Hotels Ltd.",
    currentPrice: 164.31,
    change: 5.81,
    changePercent: 3.67,
    high: 168.5,
    low: 154.34,
    volume: 20007496,
    history: generateInitialHistory(164.31)
  },
  {
    ticker: "TMPV",
    name: "Tata Motors Passenger Vehicles Ltd.",
    currentPrice: 263.7,
    change: -14.3,
    changePercent: -5.14,
    high: 264.65,
    low: 259.4,
    volume: 8760167,
    history: generateInitialHistory(263.7)
  },
  {
    ticker: "ATHER",
    name: "Ather Energy Ltd.",
    currentPrice: 1575,
    change: 116,
    changePercent: 7.95,
    high: 1623,
    low: 1345.7,
    volume: 9122821,
    history: generateInitialHistory(1575)
  },
  {
    ticker: "RBA",
    name: "Restaurant Brands Asia Ltd.",
    currentPrice: 91.9,
    change: 1.32,
    changePercent: 1.46,
    high: 93.6,
    low: 86.9,
    volume: 3786415,
    history: generateInitialHistory(91.9)
  },
  {
    ticker: "DEEPAKBUILD",
    name: "Deepak Builders & Engineers India Ltd.",
    currentPrice: 6.17,
    change: -0.09,
    changePercent: -1.44,
    high: 6.28,
    low: 5.82,
    volume: 252958,
    history: generateInitialHistory(6.17)
  },
  {
    ticker: "GROWW",
    name: "Groww (Billionbrains Garage Ventures)",
    currentPrice: 184.48,
    change: -13.6,
    changePercent: -6.87,
    high: 185.86,
    low: 177.5,
    volume: 19274171,
    history: generateInitialHistory(184.48)
  },
  {
    ticker: "AFCONS",
    name: "Afcons Infrastructure Ltd.",
    currentPrice: 211.55,
    change: -33.56,
    changePercent: -13.69,
    high: 217.84,
    low: 211,
    volume: 548018,
    history: generateInitialHistory(211.55)
  },
  {
    ticker: "HIGHWAY",
    name: "Highway Infrastructure Trust",
    currentPrice: 61.53,
    change: 8.28,
    changePercent: 15.55,
    high: 64.98,
    low: 54.8,
    volume: 2951830,
    history: generateInitialHistory(61.53)
  },
  {
    ticker: "ABCAPITAL",
    name: "Aditya Birla Capital Ltd.",
    currentPrice: 353.05,
    change: -20,
    changePercent: -5.36,
    high: 353.05,
    low: 334.45,
    volume: 2054543,
    history: generateInitialHistory(353.05)
  },
  {
    ticker: "GOPAL",
    name: "Gopal Snacks Ltd.",
    currentPrice: 240.35,
    change: -9,
    changePercent: -3.61,
    high: 244.8,
    low: 237.65,
    volume: 54597,
    history: generateInitialHistory(240.35)
  },
  {
    ticker: "JIOFIN",
    name: "Jio Financial Services Ltd.",
    currentPrice: 205.23,
    change: -8.77,
    changePercent: -4.1,
    high: 206.16,
    low: 202.6,
    volume: 11412253,
    history: generateInitialHistory(205.23)
  },
  {
    ticker: "OLAELEC",
    name: "Ola Electric Mobility Ltd.",
    currentPrice: 29.94,
    change: -4.55,
    changePercent: -13.19,
    high: 30.37,
    low: 29.18,
    volume: 43593197,
    history: generateInitialHistory(29.94)
  },
  {
    ticker: "INFOBEAN",
    name: "InfoBeans Technologies Ltd.",
    currentPrice: 148.64,
    change: -10.26,
    changePercent: -6.46,
    high: 151.19,
    low: 143.77,
    volume: 158116,
    history: generateInitialHistory(148.64)
  },
  {
    ticker: "ADITYAINFO",
    name: "Aditya Infotech Ltd.",
    currentPrice: 3867.4,
    change: -142.6,
    changePercent: -3.56,
    high: 3917,
    low: 3760.4,
    volume: 244583,
    history: generateInitialHistory(3867.4)
  },
  {
    ticker: "NSDL",
    name: "NSDL (National Securities Depository Ltd.)",
    currentPrice: 699.8,
    change: -46.4,
    changePercent: -6.22,
    high: 705,
    low: 688,
    volume: 463665,
    history: generateInitialHistory(699.8)
  },
  {
    ticker: "GNGELEC",
    name: "GNG Electronics Ltd.",
    currentPrice: 708.6,
    change: 8.4,
    changePercent: 1.2,
    high: 721.2,
    low: 675,
    volume: 953552,
    history: generateInitialHistory(708.6)
  },
  {
    ticker: "VISHAL",
    name: "Vishal Mega Mart Ltd.",
    currentPrice: 15.97,
    change: -0.7,
    changePercent: -4.2,
    high: 16.4,
    low: 15.8,
    volume: 20499,
    history: generateInitialHistory(15.97)
  },
  {
    ticker: "ENVIROINFRA",
    name: "Enviro Infra Engineers Ltd.",
    currentPrice: 162.57,
    change: -19.88,
    changePercent: -10.9,
    high: 163.95,
    low: 158.4,
    volume: 446979,
    history: generateInitialHistory(162.57)
  },
  {
    ticker: "ANTHEM",
    name: "Anthem Biosciences Ltd.",
    currentPrice: 822.25,
    change: 13.75,
    changePercent: 1.7,
    high: 825,
    low: 802.05,
    volume: 183654,
    history: generateInitialHistory(822.25)
  },
  {
    ticker: "SALASAR",
    name: "Salasar Techno Engineering Ltd.",
    currentPrice: 3.83,
    change: -0.3,
    changePercent: -7.26,
    high: 3.88,
    low: 3.6,
    volume: 3029461,
    history: generateInitialHistory(3.83)
  },
  {
    ticker: "SHANTIGOLD",
    name: "Shanti Gold International Ltd.",
    currentPrice: 327.6,
    change: -87.05,
    changePercent: -20.99,
    high: 376.45,
    low: 322.25,
    volume: 3846135,
    history: generateInitialHistory(327.6)
  },
  {
    ticker: "MEESHO",
    name: "Meesho Ltd.",
    currentPrice: 214.84,
    change: -14.75,
    changePercent: -6.42,
    high: 215.99,
    low: 209.6,
    volume: 5577297,
    history: generateInitialHistory(214.84)
  },
  {
    ticker: "ANANTRAJ",
    name: "Anant Raj Ltd.",
    currentPrice: 458.85,
    change: -38.7,
    changePercent: -7.78,
    high: 470.8,
    low: 451.4,
    volume: 1369102,
    history: generateInitialHistory(458.85)
  },
  {
    ticker: "JUPITERWAG",
    name: "Jupiter Wagons Ltd.",
    currentPrice: 174.61,
    change: -22.12,
    changePercent: -11.24,
    high: 176.35,
    low: 169.08,
    volume: 1085021,
    history: generateInitialHistory(174.61)
  },
  {
    ticker: "RPOWER",
    name: "Reliance Power Ltd.",
    currentPrice: 16.54,
    change: -1.35,
    changePercent: -7.55,
    high: 16.7,
    low: 16.06,
    volume: 27511953,
    history: generateInitialHistory(16.54)
  },
  {
    ticker: "NHPC",
    name: "NHPC Ltd.",
    currentPrice: 70.56,
    change: -0.14,
    changePercent: -0.2,
    high: 70.85,
    low: 68.79,
    volume: 7246128,
    history: generateInitialHistory(70.56)
  },
  {
    ticker: "IOB",
    name: "Indian Overseas Bank",
    currentPrice: 30.38,
    change: -0.33,
    changePercent: -1.07,
    high: 30.52,
    low: 28.32,
    volume: 17478724,
    history: generateInitialHistory(30.38)
  },
  {
    ticker: "GTLINFRA",
    name: "GTL Infrastructure Ltd.",
    currentPrice: 0.99,
    change: -0.03,
    changePercent: -2.94,
    high: 1.01,
    low: 0.99,
    volume: 15158058,
    history: generateInitialHistory(0.99)
  },
  {
    ticker: "PNB",
    name: "Punjab National Bank",
    currentPrice: 120.89,
    change: -1.01,
    changePercent: -0.83,
    high: 120.89,
    low: 118.2,
    volume: 13589182,
    history: generateInitialHistory(120.89)
  },
  {
    ticker: "ACMESOLAR",
    name: "Acme Solar Holdings Ltd.",
    currentPrice: 382.15,
    change: -35.6,
    changePercent: -8.52,
    high: 384.45,
    low: 366.3,
    volume: 1129541,
    history: generateInitialHistory(382.15)
  },
  {
    ticker: "PREMIERENE",
    name: "Premier Energies Ltd.",
    currentPrice: 840.6,
    change: -58.4,
    changePercent: -6.5,
    high: 867,
    low: 838.85,
    volume: 706053,
    history: generateInitialHistory(840.6)
  },
  {
    ticker: "ABSLAMC",
    name: "Aditya Birla Sun Life AMC Ltd.",
    currentPrice: 882.5,
    change: -76.2,
    changePercent: -7.95,
    high: 896,
    low: 854.4,
    volume: 291906,
    history: generateInitialHistory(882.5)
  },
  {
    ticker: "CANBK",
    name: "Canara Bank",
    currentPrice: 116.71,
    change: -5.29,
    changePercent: -4.34,
    high: 116.97,
    low: 114.63,
    volume: 16341841,
    history: generateInitialHistory(116.71)
  },
  {
    ticker: "IDEA",
    name: "Vodafone Idea Ltd.",
    currentPrice: 11.95,
    change: -0.33,
    changePercent: -2.69,
    high: 12.01,
    low: 11.21,
    volume: 492700543,
    history: generateInitialHistory(11.95)
  },
  {
    ticker: "DEVYANI",
    name: "Devyani International Ltd.",
    currentPrice: 120.12,
    change: 1.8,
    changePercent: 1.52,
    high: 120.65,
    low: 115.1,
    volume: 1273842,
    history: generateInitialHistory(120.12)
  },
  {
    ticker: "TATAPOWER",
    name: "Tata Power Company Ltd.",
    currentPrice: 338.5,
    change: -13.75,
    changePercent: -3.9,
    high: 348.45,
    low: 333.2,
    volume: 9488076,
    history: generateInitialHistory(338.5)
  },
  {
    ticker: "RVNL",
    name: "Rail Vikas Nigam Ltd.",
    currentPrice: 182.65,
    change: -11.85,
    changePercent: -6.09,
    high: 185.43,
    low: 177.86,
    volume: 4535151,
    history: generateInitialHistory(182.65)
  }
];

function generateInitialHistory(currentPrice: number): StockHistory[] {
  const history: StockHistory[] = [];
  let price = currentPrice;
  const date = new Date();
  
  for (let i = 0; i <= 260; i++) {
    const d = new Date(date);
    d.setDate(date.getDate() - i);
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    
    const finalPrice = Number(price.toFixed(2));
    // Add to the front of the array since we are working backwards in time
    history.unshift({
      date: dateStr,
      price: finalPrice,
      open: Number((finalPrice * 0.995).toFixed(2)),
      high: Number((finalPrice * 1.01).toFixed(2)),
      low: Number((finalPrice * 0.99).toFixed(2)),
      close: finalPrice,
      volume: Math.floor(Math.random() * 500000) + 100000
    });
    
    // Tracing backwards: reverse a random walk with positive drift (0.55 up, 0.45 down)
    const changePercent = (Math.random() - 0.45) * 0.015; // -0.675% to +0.825%
    price = price / (1 + changePercent);
  }
  
  return history;
}

export function simulatePriceUpdate(stocks: Stock[]): Stock[] {
  return stocks.map(stock => {
    // Small random price movement (-0.5% to +0.5%)
    const pctChange = (Math.random() - 0.5) * 0.01;
    const oldPrice = stock.currentPrice;
    const newPrice = Number((oldPrice * (1 + pctChange)).toFixed(2));
    
    // Ensure price remains positive
    if (newPrice <= 0) return stock;

    const change = Number((newPrice - (oldPrice - stock.change)).toFixed(2));
    // Calculate new base price reference (initial price of the day)
    const basePrice = oldPrice - stock.change;
    const changePercent = Number(((newPrice - basePrice) / basePrice * 100).toFixed(2));
    
    const high = Number(Math.max(stock.high, newPrice).toFixed(2));
    const low = Number(Math.min(stock.low, newPrice).toFixed(2));
    
    // Add new data point to history, updating the last item or adding a new one
    const history = [...stock.history];
    if (history.length > 0) {
      const last = history[history.length - 1];
      const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const itemToUpdateOrAdd = {
        date: todayStr,
        price: newPrice,
        open: last ? last.open : Number((newPrice * 0.995).toFixed(2)),
        high: Number(Math.max(last ? last.high : newPrice, newPrice).toFixed(2)),
        low: Number(Math.min(last ? last.low : newPrice, newPrice).toFixed(2)),
        close: newPrice,
        volume: (last ? last.volume : 100000) + Math.floor(Math.random() * 5000)
      };
      if (last.date === todayStr) {
        history[history.length - 1] = itemToUpdateOrAdd;
      } else {
        history.push(itemToUpdateOrAdd);
        if (history.length > 261) history.shift();
      }
    }

    return {
      ...stock,
      currentPrice: newPrice,
      change,
      changePercent,
      high,
      low,
      volume: stock.volume + Math.floor(Math.random() * 1000),
      history
    };
  });
}

/*
  ====================================================================================
  PLAIN ENGLISH TECHNICAL INDICATORS EXPLANATION (Required for suggestions & screener)
  ====================================================================================

  1. EXPONENTIAL MOVING AVERAGE (EMA):
     An Exponential Moving Average is a type of moving average that gives more weight to recent prices.
     This helps it react faster to new price trends than a Simple Moving Average (SMA), which weights
     all days equally. It is crucial for capturing short-term direction changes.

  2. MOVING AVERAGE CONVERGENCE DIVERGENCE (MACD):
     MACD is a classic trend-following momentum indicator. It is computed as:
     - MACD Line: 12-period EMA minus 26-period EMA.
     - Signal Line: A 9-period EMA of the MACD Line.
     - Histogram: MACD Line minus Signal Line.
     PLAIN ENGLISH LOGIC:
     - When the MACD Line is ABOVE the Signal Line (Histogram is positive), it means bullish momentum is building (BUY setup).
     - When the MACD Line is BELOW the Signal Line (Histogram is negative), it means bearish momentum is building (SELL setup).

  3. BOLLINGER BANDS:
     Bollinger Bands measure market volatility using standard deviation:
     - Middle Band: 20-period Simple Moving Average (SMA).
     - Upper Band: Middle Band plus 2 standard deviations.
     - Lower Band: Middle Band minus 2 standard deviations.
     PLAIN ENGLISH LOGIC:
     - When the price drops to or below the LOWER Band, the stock is statistically oversold. It is a potential
       area of support and bullish reversal (BUY/Accumulate setup).
     - When the price rises to or above the UPPER Band, the stock is statistically overbought. It is a potential
       area of resistance and bearish pullback (SELL/Distribution setup).
     - Within the bands, the market is in a normal consolidated or trending state.

  4. WEIGHTED SCORING SYSTEM:
     To avoid false signals from any single indicator, we compile a unified Weighted Score (ranging from -100 to +100):
     - SMA Crossover (30% weight): +30 points if short-term SMA(5) > medium-term SMA(15) [Bullish Trend], -30 points otherwise.
     - MACD Momentum (35% weight): +35 points if MACD Line > Signal Line [Bullish Momentum], -35 points otherwise.
     - Bollinger Bands (35% weight): +35 points if price is oversold (<= Lower Band) [Bullish Reversal],
       -35 points if price is overbought (>= Upper Band) [Bearish Reversal].
       If the price is between the bands, we add a minor trend alignment:
         - +10 points if price is in the lower half (recovering from support).
         - -10 points if price is in the upper half (cooling from resistance).
     
     VERDICT:
     - Score >= +25: BUY suggestion.
     - Score <= -25: SELL suggestion.
     - Between -25 and +25: HOLD suggestion.
     - Confidence: The magnitude of indicator agreement (strength of convergence), scaled between 30% and 100%.
*/

export interface MacdResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface BollingerBandsResult {
  middleBand: number;
  upperBand: number;
  lowerBand: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}

export interface DetailedSuggestionResult {
  suggestion: 'BUY' | 'SELL' | 'HOLD';
  score: number;
  smaSignal: 'BUY' | 'SELL';
  macd: MacdResult;
  bollingerBands: BollingerBandsResult;
}

// Calculate Exponential Moving Average helper
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];
  
  // Initialize first value with SMA or first price
  let currentEma = prices[0];
  ema.push(currentEma);
  
  for (let i = 1; i < prices.length; i++) {
    currentEma = prices[i] * k + currentEma * (1 - k);
    ema.push(currentEma);
  }
  return ema;
}

// Calculate Moving Average Convergence Divergence
export function calculateMACD(history: { price: number }[]): MacdResult {
  const prices = history.map(h => h.price);
  if (prices.length < 26) {
    return { macdLine: 0, signalLine: 0, histogram: 0, signal: 'NEUTRAL' };
  }
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  const macdLines: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLines.push(ema12[i] - ema26[i]);
  }
  
  const signalLines = calculateEMA(macdLines, 9);
  
  const currentMacd = macdLines[macdLines.length - 1] || 0;
  const currentSignal = signalLines[signalLines.length - 1] || 0;
  const histogram = currentMacd - currentSignal;
  
  const signal = currentMacd > currentSignal ? 'BULLISH' : 'BEARISH';
  
  return {
    macdLine: Number(currentMacd.toFixed(3)),
    signalLine: Number(currentSignal.toFixed(3)),
    histogram: Number(histogram.toFixed(3)),
    signal
  };
}

// Calculate Bollinger Bands
export function calculateBollingerBands(
  history: { price: number }[],
  period = 20,
  numStdDev = 2
): BollingerBandsResult {
  const prices = history.map(h => h.price);
  const currentPrice = prices[prices.length - 1] || 0;
  
  if (prices.length < period) {
    return {
      middleBand: currentPrice,
      upperBand: currentPrice,
      lowerBand: currentPrice,
      signal: 'NEUTRAL'
    };
  }
  
  const slice = prices.slice(-period);
  const sum = slice.reduce((acc, curr) => acc + curr, 0);
  const middleBand = sum / period;
  
  const variance = slice.reduce((acc, curr) => acc + Math.pow(curr - middleBand, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  const upperBand = middleBand + numStdDev * stdDev;
  const lowerBand = middleBand - numStdDev * stdDev;
  
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (currentPrice <= lowerBand) {
    signal = 'BUY';
  } else if (currentPrice >= upperBand) {
    signal = 'SELL';
  }
  
  return {
    middleBand: Number(middleBand.toFixed(2)),
    upperBand: Number(upperBand.toFixed(2)),
    lowerBand: Number(lowerBand.toFixed(2)),
    signal
  };
}

// Unified Suggester & Weighted Scoring Engine
export function calculateDetailedStockSuggestion(historyOrStock: any): DetailedSuggestionResult {
  const fallbackResult: DetailedSuggestionResult = {
    suggestion: 'HOLD',
    score: 0,
    smaSignal: 'SELL',
    macd: { macdLine: 0, signalLine: 0, histogram: 0, signal: 'NEUTRAL' },
    bollingerBands: { middleBand: 0, upperBand: 0, lowerBand: 0, signal: 'NEUTRAL' }
  };

  const history: { price: number }[] | null = Array.isArray(historyOrStock)
    ? historyOrStock
    : Array.isArray(historyOrStock?.history)
    ? historyOrStock.history
    : null;

  if (!history || history.length < 20) {
    return fallbackResult;
  }

  const prices = history.map(h => (typeof h === 'number' ? h : h?.price ?? 0));
  const currentPrice = prices[prices.length - 1] || 0;

  // 1. SMA 5 vs SMA 15 Crossover (30% weight)
  const sma5Slice = history.slice(-5);
  const sma5 = sma5Slice.reduce((acc, curr) => acc + curr.price, 0) / 5;
  const sma15Slice = history.slice(-15);
  const sma15 = sma15Slice.reduce((acc, curr) => acc + curr.price, 0) / 15;
  const smaSignal = sma5 > sma15 ? 'BUY' : 'SELL';
  const smaPoints = smaSignal === 'BUY' ? 30 : -30;

  // 2. MACD Momentum (35% weight)
  const macd = calculateMACD(history);
  const macdPoints = macd.signal === 'BULLISH' ? 35 : -35;

  // 3. Bollinger Bands (35% weight)
  const bollingerBands = calculateBollingerBands(history);
  let bbPoints = 0;
  if (bollingerBands.signal === 'BUY') {
    bbPoints = 35; // Strongly Oversold (Bullish reversal buy setup)
  } else if (bollingerBands.signal === 'SELL') {
    bbPoints = -35; // Strongly Overbought (Bearish reversal sell setup)
  } else {
    // Normal channel positioning
    const { middleBand, upperBand, lowerBand } = bollingerBands;
    const range = upperBand - lowerBand;
    if (range > 0) {
      const relativePosition = (currentPrice - lowerBand) / range;
      if (relativePosition < 0.5) {
        bbPoints = 10; // In lower half (approaching support)
      } else {
        bbPoints = -10; // In upper half (approaching resistance)
      }
    }
  }

  // Aggregate weighted score (-100 to +100)
  const score = smaPoints + macdPoints + bbPoints;

  // Map score to Buy/Hold/Sell suggestion
  let suggestion: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  if (score >= 25) {
    suggestion = 'BUY';
  } else if (score <= -25) {
    suggestion = 'SELL';
  }

  return {
    suggestion,
    score,
    smaSignal,
    macd,
    bollingerBands
  };
}

export function getStockTrendSignal(history: { price: number }[]): 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' {
  if (!history || history.length < 15) return 'NEUTRAL';
  const detailed = calculateDetailedStockSuggestion(history);
  return detailed.suggestion;
}
