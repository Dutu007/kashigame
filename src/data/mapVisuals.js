import cityUrl from '../assets/kashgar-city-chapters-v4.png'
import originalUrl from '../assets/kashgar-five-chapters-sparse.png'

// One normalized coordinate space for art, masks, effects and pointer regions.
export const mapArt = { cityUrl, originalUrl, width: 1671, height: 941 }
// Preserve original pixels inside both established chapters; feather only their perimeter.
export const protectedRegions = [
  '0,43 5,40 12,36 20,37 26,44 29,53 32,58 38,64 41,77 39,83 29,89 13,88 0,82',
  '0,9 8,5 14,6 18,13 24,16 31,21 39,25 43,30 39,34 28,36 17,35 8,37 0,36',
]
export const mapVisuals = {
  1: { theme: 'silk', points: protectedRegions[0], lights: [[8,60,2,3],[24,69,3,2]], threads: ['M5 55 Q8 56 11 54', 'M21 66 Q25 68 29 66'] },
  2: { theme: 'water', points: protectedRegions[1], wells: [[19.3,17.8],[23.8,23],[37.3,27.3]], lights: [[19.3,17.8,1.6,.6],[23.8,23,1.6,.6],[37.3,27.3,1.6,.6]] },
  3: { theme: 'market', points: '40,36 43,32 50,30 53,33 54,37 59,35 62,41 69,45 73,51 69,61 64,66 60,70 53,68 43,61 38,52 33,49 34,42', lights: [[43,53,2,2],[57,59,2,2],[65,50,2,2]], threads: ['M40 49 Q44 52 48 50', 'M57 56 Q61 57 64 55'] },
  4: { theme: 'pottery', points: '62,21 67,17 72,13 81,14 86,16 90,18 95,15 100,21 100,44 91,48 82,45 75,40 70,37 65,33 61,28', lights: [[90.8,28,1.1,1.6]], heat: 'M90.8 27 Q90.3 25.8 91 24.5 Q91.6 23.7 91.2 22.8' },
  5: { theme: 'music', points: '76,56 84,53 93,54 100,59 100,90 95,95 85,94 77,90 71,85 66,79 66,70 70,62', lights: [[84,69,2,3],[91,75,3,1.5]], threads: ['M82 61 Q85 63 88 62', 'M92 63 Q95 65 98 63'] },
}
