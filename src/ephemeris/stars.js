import * as Astronomy from 'astronomy-engine';
import { formatNauticalDegrees, normalizeDegrees } from './angles.js';

export const NAVIGATIONAL_STARS = [
  {
    "name": "Alpheratz",
    "flags": "f|S|B9",
    "ra": "0:08:23.26",
    "pmRa": 137.46,
    "dec": "29:05:25.55",
    "pmDec": -163.44,
    "mag": 2.04,
    "epoch": 2000
  },
  {
    "name": "Ankaa",
    "flags": "f|S|K0",
    "ra": "0:26:17.05",
    "pmRa": 233.05,
    "dec": "-42:18:21.55",
    "pmDec": -356.3,
    "mag": 2.55,
    "epoch": 2000
  },
  {
    "name": "Schedar",
    "flags": "f|S|K0",
    "ra": "0:40:30.44",
    "pmRa": 50.88,
    "dec": "56:32:14.39",
    "pmDec": -32.13,
    "mag": 2.41,
    "epoch": 2000
  },
  {
    "name": "Diphda",
    "flags": "f|S|G9",
    "ra": "0:43:35.37",
    "pmRa": 232.55,
    "dec": "-17:59:11.78",
    "pmDec": 31.99,
    "mag": 2.21,
    "epoch": 2000
  },
  {
    "name": "Achernar",
    "flags": "f|S|B3",
    "ra": "1:37:42.85",
    "pmRa": 87,
    "dec": "-57:14:12.31",
    "pmDec": -38.24,
    "mag": 0.42,
    "epoch": 2000
  },
  {
    "name": "Hamal",
    "flags": "f|S|K2",
    "ra": "2:07:10.41",
    "pmRa": 188.55,
    "dec": "23:27:44.70",
    "pmDec": -148.08,
    "mag": 2.17,
    "epoch": 2000
  },
  {
    "name": "Polaris",
    "flags": "f|S|F7",
    "ra": "2:31:49.09",
    "pmRa": 44.48,
    "dec": "89:15:50.79",
    "pmDec": -11.85,
    "mag": 2.11,
    "epoch": 2000
  },
  {
    "name": "Acamar",
    "flags": "f|S|A4",
    "ra": "2:58:15.68",
    "pmRa": -52.89,
    "dec": "-40:18:16.85",
    "pmDec": 21.98,
    "mag": 2.94,
    "epoch": 2000
  },
  {
    "name": "Menkar",
    "flags": "f|S|M2",
    "ra": "3:02:16.77",
    "pmRa": -10.41,
    "dec": "4:05:23.06",
    "pmDec": -76.85,
    "mag": 2.62,
    "epoch": 2000
  },
  {
    "name": "Mirfak",
    "flags": "f|S|F5",
    "ra": "3:24:19.37",
    "pmRa": 23.75,
    "dec": "49:51:40.25",
    "pmDec": -26.23,
    "mag": 1.9,
    "epoch": 2000
  },
  {
    "name": "Aldebaran",
    "flags": "f|S|K5",
    "ra": "4:35:55.24",
    "pmRa": 63.45,
    "dec": "16:30:33.49",
    "pmDec": -188.94,
    "mag": 1,
    "epoch": 2000
  },
  {
    "name": "Rigel",
    "flags": "f|S|B8",
    "ra": "5:14:32.27",
    "pmRa": 1.31,
    "dec": "-8:12:05.90",
    "pmDec": 0.5,
    "mag": 0.19,
    "epoch": 2000
  },
  {
    "name": "Capella",
    "flags": "f|S|M1",
    "ra": "5:16:41.36",
    "pmRa": 75.25,
    "dec": "45:59:52.77",
    "pmDec": -426.89,
    "mag": 0.24,
    "epoch": 2000
  },
  {
    "name": "Bellatrix",
    "flags": "f|S|B2",
    "ra": "5:25:07.86",
    "pmRa": -8.11,
    "dec": "6:20:58.93",
    "pmDec": -12.88,
    "mag": 1.55,
    "epoch": 2000
  },
  {
    "name": "Elnath",
    "flags": "f|S|B7",
    "ra": "5:26:17.51",
    "pmRa": 22.76,
    "dec": "28:36:26.83",
    "pmDec": -173.58,
    "mag": 1.62,
    "epoch": 2000
  },
  {
    "name": "Alnilam",
    "flags": "f|S|B0",
    "ra": "5:36:12.81",
    "pmRa": 1.44,
    "dec": "-1:12:06.91",
    "pmDec": -0.78,
    "mag": 1.62,
    "epoch": 2000
  },
  {
    "name": "Betelgeuse",
    "flags": "f|S|M2",
    "ra": "5:55:10.31",
    "pmRa": 27.54,
    "dec": "7:24:25.43",
    "pmDec": 11.3,
    "mag": 0.5,
    "epoch": 2000
  },
  {
    "name": "Canopus",
    "flags": "f|S|F0",
    "ra": "6:23:57.11",
    "pmRa": 19.93,
    "dec": "-52:41:44.38",
    "pmDec": 23.24,
    "mag": -0.55,
    "epoch": 2000
  },
  {
    "name": "Sirius",
    "flags": "f|S|A0",
    "ra": "6:45:08.92",
    "pmRa": -546.01,
    "dec": "-16:42:58.02",
    "pmDec": -1223.07,
    "mag": -1.09,
    "epoch": 2000
  },
  {
    "name": "Adhara",
    "flags": "f|S|B2",
    "ra": "6:58:37.55",
    "pmRa": 3.24,
    "dec": "-28:58:19.51",
    "pmDec": 1.33,
    "mag": 1.42,
    "epoch": 2000
  },
  {
    "name": "Procyon",
    "flags": "f|S|F5",
    "ra": "7:39:18.12",
    "pmRa": -714.59,
    "dec": "5:13:29.96",
    "pmDec": -1036.8,
    "mag": 0.46,
    "epoch": 2000
  },
  {
    "name": "Pollux",
    "flags": "f|S|K0",
    "ra": "7:45:18.95",
    "pmRa": -626.55,
    "dec": "28:01:34.32",
    "pmDec": -45.8,
    "mag": 1.29,
    "epoch": 2000
  },
  {
    "name": "Avior",
    "flags": "f|S|K3",
    "ra": "8:22:30.84",
    "pmRa": -25.52,
    "dec": "-59:30:34.14",
    "pmDec": 22.06,
    "mag": 2,
    "epoch": 2000
  },
  {
    "name": "Suhail",
    "flags": "f|S|K4",
    "ra": "9:07:59.76",
    "pmRa": -24.01,
    "dec": "-43:25:57.33",
    "pmDec": 13.52,
    "mag": 2.34,
    "epoch": 2000
  },
  {
    "name": "Miaplacidus",
    "flags": "f|S|A2",
    "ra": "9:13:11.98",
    "pmRa": -156.47,
    "dec": "-69:43:01.95",
    "pmDec": 108.95,
    "mag": 1.66,
    "epoch": 2000
  },
  {
    "name": "Alphard",
    "flags": "f|S|K3",
    "ra": "9:27:35.24",
    "pmRa": -15.23,
    "dec": "-8:39:30.96",
    "pmDec": 34.37,
    "mag": 2.14,
    "epoch": 2000
  },
  {
    "name": "Regulus",
    "flags": "f|S|B7",
    "ra": "10:08:22.31",
    "pmRa": -248.73,
    "dec": "11:58:01.95",
    "pmDec": 5.59,
    "mag": 1.32,
    "epoch": 2000
  },
  {
    "name": "Dubhe",
    "flags": "f|S|F7",
    "ra": "11:03:43.67",
    "pmRa": -134.11,
    "dec": "61:45:03.72",
    "pmDec": -34.7,
    "mag": 1.95,
    "epoch": 2000
  },
  {
    "name": "Denebola",
    "flags": "f|S|A3",
    "ra": "11:49:03.58",
    "pmRa": -497.68,
    "dec": "14:34:19.41",
    "pmDec": -114.67,
    "mag": 2.16,
    "epoch": 2000
  },
  {
    "name": "Gienah",
    "flags": "f|S|B8",
    "ra": "12:15:48.37",
    "pmRa": -158.61,
    "dec": "-17:32:30.95",
    "pmDec": 21.86,
    "mag": 2.55,
    "epoch": 2000
  },
  {
    "name": "Acrux",
    "flags": "f|S|B0",
    "ra": "12:26:35.90",
    "pmRa": -35.83,
    "dec": "-63:05:56.73",
    "pmDec": -14.86,
    "mag": 0.67,
    "epoch": 2000
  },
  {
    "name": "Gacrux",
    "flags": "f|S|M4",
    "ra": "12:31:09.96",
    "pmRa": 28.23,
    "dec": "-57:06:47.57",
    "pmDec": -265.08,
    "mag": 1.63,
    "epoch": 2000
  },
  {
    "name": "Alioth",
    "flags": "f|S|A0",
    "ra": "12:54:01.75",
    "pmRa": 111.91,
    "dec": "55:57:35.36",
    "pmDec": -8.24,
    "mag": 1.75,
    "epoch": 2000
  },
  {
    "name": "Spica",
    "flags": "f|S|B1",
    "ra": "13:25:11.58",
    "pmRa": -42.35,
    "dec": "-11:09:40.75",
    "pmDec": -30.67,
    "mag": 0.89,
    "epoch": 2000
  },
  {
    "name": "Alkaid",
    "flags": "f|S|B3",
    "ra": "13:47:32.44",
    "pmRa": -121.17,
    "dec": "49:18:47.76",
    "pmDec": -14.91,
    "mag": 1.8,
    "epoch": 2000
  },
  {
    "name": "Hadar",
    "flags": "f|S|B1",
    "ra": "14:03:49.41",
    "pmRa": -33.27,
    "dec": "-60:22:22.93",
    "pmDec": -23.16,
    "mag": 0.54,
    "epoch": 2000
  },
  {
    "name": "Menkent",
    "flags": "f|S|K0",
    "ra": "14:06:40.95",
    "pmRa": -520.53,
    "dec": "-36:22:11.84",
    "pmDec": -518.06,
    "mag": 2.22,
    "epoch": 2000
  },
  {
    "name": "Arcturus",
    "flags": "f|S|K2",
    "ra": "14:15:39.67",
    "pmRa": -1093.39,
    "dec": "19:10:56.67",
    "pmDec": -2000.06,
    "mag": 0.11,
    "epoch": 2000
  },
  {
    "name": "Rigil Kent.",
    "flags": "f|S|G2",
    "ra": "14:39:36.49",
    "pmRa": -3679.25,
    "dec": "-60:50:02.37",
    "pmDec": 473.67,
    "mag": 0.14,
    "epoch": 2000
  },
  {
    "name": "Kochab",
    "flags": "f|S|K4",
    "ra": "14:50:42.33",
    "pmRa": -32.61,
    "dec": "74:09:19.81",
    "pmDec": 11.42,
    "mag": 2.2,
    "epoch": 2000
  },
  {
    "name": "Zuben'ubi",
    "flags": "f|S|A3",
    "ra": "14:50:52.71",
    "pmRa": -105.68,
    "dec": "-16:02:30.40",
    "pmDec": -68.4,
    "mag": 2.79,
    "epoch": 2000
  },
  {
    "name": "Alphecca",
    "flags": "f|S|A0",
    "ra": "15:34:41.27",
    "pmRa": 120.27,
    "dec": "26:42:52.89",
    "pmDec": -89.58,
    "mag": 2.22,
    "epoch": 2000
  },
  {
    "name": "Antares",
    "flags": "f|S|M1",
    "ra": "16:29:24.46",
    "pmRa": -12.11,
    "dec": "-26:25:55.21",
    "pmDec": -23.3,
    "mag": 0.98,
    "epoch": 2000
  },
  {
    "name": "Atria",
    "flags": "f|S|K2",
    "ra": "16:48:39.90",
    "pmRa": 17.99,
    "dec": "-69:01:39.76",
    "pmDec": -31.58,
    "mag": 2.07,
    "epoch": 2000
  },
  {
    "name": "Sabik",
    "flags": "f|S|A2",
    "ra": "17:10:22.69",
    "pmRa": 40.13,
    "dec": "-15:43:29.66",
    "pmDec": 99.17,
    "mag": 2.44,
    "epoch": 2000
  },
  {
    "name": "Shaula",
    "flags": "f|S|B1",
    "ra": "17:33:36.52",
    "pmRa": -8.53,
    "dec": "-37:06:13.76",
    "pmDec": -30.8,
    "mag": 1.52,
    "epoch": 2000
  },
  {
    "name": "Rasalhague",
    "flags": "f|S|A5",
    "ra": "17:34:56.07",
    "pmRa": 108.07,
    "dec": "12:33:36.13",
    "pmDec": -221.57,
    "mag": 2.13,
    "epoch": 2000
  },
  {
    "name": "Eltanin",
    "flags": "f|S|K5",
    "ra": "17:56:36.37",
    "pmRa": -8.48,
    "dec": "51:29:20.02",
    "pmDec": -22.79,
    "mag": 2.36,
    "epoch": 2000
  },
  {
    "name": "Kaus Aust.",
    "flags": "f|S|B9",
    "ra": "18:24:10.32",
    "pmRa": -39.42,
    "dec": "-34:23:04.62",
    "pmDec": -124.2,
    "mag": 1.8,
    "epoch": 2000
  },
  {
    "name": "Vega",
    "flags": "f|S|A0",
    "ra": "18:36:56.34",
    "pmRa": 200.94,
    "dec": "38:47:01.28",
    "pmDec": 286.23,
    "mag": 0.09,
    "epoch": 2000
  },
  {
    "name": "Nunki",
    "flags": "f|S|B2",
    "ra": "18:55:15.93",
    "pmRa": 15.14,
    "dec": "-26:17:48.21",
    "pmDec": -53.43,
    "mag": 2.01,
    "epoch": 2000
  },
  {
    "name": "Altair",
    "flags": "f|S|A7",
    "ra": "19:50:47.00",
    "pmRa": 536.23,
    "dec": "8:52:05.96",
    "pmDec": 385.29,
    "mag": 0.83,
    "epoch": 2000
  },
  {
    "name": "Peacock",
    "flags": "f|S|B2",
    "ra": "20:25:38.86",
    "pmRa": 6.9,
    "dec": "-56:44:06.32",
    "pmDec": -86.02,
    "mag": 1.86,
    "epoch": 2000
  },
  {
    "name": "Deneb",
    "flags": "f|S|A2",
    "ra": "20:41:25.92",
    "pmRa": 2.01,
    "dec": "45:16:49.22",
    "pmDec": 1.85,
    "mag": 1.3,
    "epoch": 2000
  },
  {
    "name": "Enif",
    "flags": "f|S|K2",
    "ra": "21:44:11.16",
    "pmRa": 26.92,
    "dec": "9:52:30.03",
    "pmDec": 0.44,
    "mag": 2.55,
    "epoch": 2000
  },
  {
    "name": "Al Na'ir",
    "flags": "f|S|B7",
    "ra": "22:08:13.98",
    "pmRa": 126.69,
    "dec": "-46:57:39.51",
    "pmDec": -147.47,
    "mag": 1.7,
    "epoch": 2000
  },
  {
    "name": "Fomalhaut",
    "flags": "f|S|A3",
    "ra": "22:57:39.05",
    "pmRa": 328.95,
    "dec": "-29:37:20.05",
    "pmDec": -164.67,
    "mag": 1.18,
    "epoch": 2000
  },
  {
    "name": "Scheat",
    "flags": "f|S|M2",
    "ra": "23:03:46.46",
    "pmRa": 187.65,
    "dec": "28:04:58.03",
    "pmDec": 136.93,
    "mag": 2.49,
    "epoch": 2000
  },
  {
    "name": "Markab",
    "flags": "f|S|B9",
    "ra": "23:04:45.65",
    "pmRa": 60.4,
    "dec": "15:12:18.96",
    "pmDec": -41.3,
    "mag": 2.48,
    "epoch": 2000
  }
];

export function navigationalStars(date) {
  const rotation = Astronomy.Rotation_EQJ_EQD(date);
  return NAVIGATIONAL_STARS.map(star => {
    const corrected = applyProperMotion(star, date);
    const vector = Astronomy.VectorFromSphere(new Astronomy.Spherical(corrected.decDegrees, corrected.raHours * 15, 1000), date);
    const ofDate = Astronomy.EquatorFromVector(Astronomy.RotateVector(rotation, vector));
    const shaDegrees = normalizeDegrees(360 - ofDate.ra * 15);
    return {
      name: star.name,
      shaDegrees,
      decDegrees: ofDate.dec,
      sha: formatNauticalDegrees(shaDegrees),
      dec: formatNauticalDegrees(ofDate.dec, 2),
      mag: star.mag
    };
  });
}

function applyProperMotion(star, date) {
  const years = decimalYear(date) - star.epoch;
  const baseRaHours = parseRaHours(star.ra);
  const baseDecDegrees = parseSignedDms(star.dec);
  const cosDec = Math.cos(baseDecDegrees * Math.PI / 180);
  const raDegrees = baseRaHours * 15 + (star.pmRa / 1000 / 3600 / Math.max(Math.abs(cosDec), 1e-8)) * years;
  const decDegrees = baseDecDegrees + (star.pmDec / 1000 / 3600) * years;
  return {
    raHours: normalizeHours(raDegrees / 15),
    decDegrees
  };
}

function decimalYear(date) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const next = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - start) / (next - start);
}

function normalizeHours(hours) {
  return ((hours % 24) + 24) % 24;
}

function parseRaHours(value) {
  const [hours, minutes, seconds] = value.split(':').map(Number);
  return hours + minutes / 60 + seconds / 3600;
}

function parseSignedDms(value) {
  const sign = value.startsWith('-') ? -1 : 1;
  const [degrees, minutes, seconds] = value.replace(/^[+-]/, '').split(':').map(Number);
  return sign * (degrees + minutes / 60 + seconds / 3600);
}
