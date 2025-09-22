// This is a shortened example of what the pro's data would look like.
// Each element in the array is a frame, and each frame contains the
// cleaned landmark data (21 points are null, 12 are objects with x,y,z).
const proTurnData = [
  // Frame 1
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.5,y:0.4,z:-0.3},{x:0.55,y:0.4,z:-0.3},{x:0.48,y:0.5,z:-0.28},{x:0.57,y:0.5,z:-0.28},{x:0.46,y:0.6,z:-0.25},{x:0.59,y:0.6,z:-0.25},null,null,null,null,null,null,{x:0.51,y:0.65,z:-0.2},{x:0.54,y:0.65,z:-0.2},{x:0.5,y:0.8,z:-0.1},{x:0.55,y:0.8,z:-0.1},{x:0.48,y:0.9,z:0},{x:0.57,y:0.9,z:0},null,null,null,null],
  // Frame 2
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.51,y:0.41,z:-0.31},{x:0.56,y:0.41,z:-0.31},{x:0.49,y:0.51,z:-0.29},{x:0.58,y:0.51,z:-0.29},{x:0.47,y:0.61,z:-0.26},{x:0.6,y:0.61,z:-0.26},null,null,null,null,null,null,{x:0.52,y:0.66,z:-0.21},{x:0.55,y:0.66,z:-0.21},{x:0.51,y:0.81,z:-0.11},{x:0.56,y:0.81,z:-0.11},{x:0.49,y:0.91,z:-0.01},{x:0.58,y:0.91,z:-0.01},null,null,null,null],
  // Frame 3
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.52,y:0.42,z:-0.32},{x:0.57,y:0.42,z:-0.32},{x:0.5,y:0.52,z:-0.3},{x:0.59,y:0.52,z:-0.3},{x:0.48,y:0.62,z:-0.27},{x:0.61,y:0.62,z:-0.27},null,null,null,null,null,null,{x:0.53,y:0.67,z:-0.22},{x:0.56,y:0.67,z:-0.22},{x:0.52,y:0.82,z:-0.12},{x:0.57,y:0.82,z:-0.12},{x:0.5,y:0.92,z:-0.02},{x:0.59,y:0.92,z:-0.02},null,null,null,null],
  // Frame 4
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.53,y:0.43,z:-0.33},{x:0.58,y:0.43,z:-0.33},{x:0.51,y:0.53,z:-0.31},{x:0.6,y:0.53,z:-0.31},{x:0.49,y:0.63,z:-0.28},{x:0.62,y:0.63,z:-0.28},null,null,null,null,null,null,{x:0.54,y:0.68,z:-0.23},{x:0.57,y:0.68,z:-0.23},{x:0.53,y:0.83,z:-0.13},{x:0.58,y:0.83,z:-0.13},{x:0.51,y:0.93,z:-0.03},{x:0.6,y:0.93,z:-0.03},null,null,null,null],
  // Frame 5
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.54,y:0.44,z:-0.34},{x:0.59,y:0.44,z:-0.34},{x:0.52,y:0.54,z:-0.32},{x:0.61,y:0.54,z:-0.32},{x:0.5,y:0.64,z:-0.29},{x:0.63,y:0.64,z:-0.29},null,null,null,null,null,null,{x:0.55,y:0.69,z:-0.24},{x:0.58,y:0.69,z:-0.24},{x:0.54,y:0.84,z:-0.14},{x:0.59,y:0.84,z:-0.14},{x:0.52,y:0.94,z:-0.04},{x:0.61,y:0.94,z:-0.04},null,null,null,null],
  // Frame 6
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.55,y:0.45,z:-0.35},{x:0.6,y:0.45,z:-0.35},{x:0.53,y:0.55,z:-0.33},{x:0.62,y:0.55,z:-0.33},{x:0.51,y:0.65,z:-0.3},{x:0.64,y:0.65,z:-0.3},null,null,null,null,null,null,{x:0.56,y:0.7,z:-0.25},{x:0.59,y:0.7,z:-0.25},{x:0.55,y:0.85,z:-0.15},{x:0.6,y:0.85,z:-0.15},{x:0.53,y:0.95,z:-0.05},{x:0.62,y:0.95,z:-0.05},null,null,null,null],
  // Frame 7
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.56,y:0.46,z:-0.36},{x:0.61,y:0.46,z:-0.36},{x:0.54,y:0.56,z:-0.34},{x:0.63,y:0.56,z:-0.34},{x:0.52,y:0.66,z:-0.31},{x:0.65,y:0.66,z:-0.31},null,null,null,null,null,null,{x:0.57,y:0.71,z:-0.26},{x:0.6,y:0.71,z:-0.26},{x:0.56,y:0.86,z:-0.16},{x:0.61,y:0.86,z:-0.16},{x:0.54,y:0.96,z:-0.06},{x:0.63,y:0.96,z:-0.06},null,null,null,null],
  // Frame 8
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.57,y:0.47,z:-0.37},{x:0.62,y:0.47,z:-0.37},{x:0.55,y:0.57,z:-0.35},{x:0.64,y:0.57,z:-0.35},{x:0.53,y:0.67,z:-0.32},{x:0.66,y:0.67,z:-0.32},null,null,null,null,null,null,{x:0.58,y:0.72,z:-0.27},{x:0.61,y:0.72,z:-0.27},{x:0.57,y:0.87,z:-0.17},{x:0.62,y:0.87,z:-0.17},{x:0.55,y:0.97,z:-0.07},{x:0.64,y:0.97,z:-0.07},null,null,null,null],
  // Frame 9
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.58,y:0.48,z:-0.38},{x:0.63,y:0.48,z:-0.38},{x:0.56,y:0.58,z:-0.36},{x:0.65,y:0.58,z:-0.36},{x:0.54,y:0.68,z:-0.33},{x:0.67,y:0.68,z:-0.33},null,null,null,null,null,null,{x:0.59,y:0.73,z:-0.28},{x:0.62,y:0.73,z:-0.28},{x:0.58,y:0.88,z:-0.18},{x:0.63,y:0.88,z:-0.18},{x:0.56,y:0.98,z:-0.08},{x:0.65,y:0.98,z:-0.08},null,null,null,null],
  // Frame 10
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.59,y:0.49,z:-0.39},{x:0.64,y:0.49,z:-0.39},{x:0.57,y:0.59,z:-0.37},{x:0.66,y:0.59,z:-0.37},{x:0.55,y:0.69,z:-0.34},{x:0.68,y:0.69,z:-0.34},null,null,null,null,null,null,{x:0.6,y:0.74,z:-0.29},{x:0.63,y:0.74,z:-0.29},{x:0.59,y:0.89,z:-0.19},{x:0.64,y:0.89,z:-0.19},{x:0.57,y:0.99,z:-0.09},{x:0.66,y:0.99,z:-0.09},null,null,null,null],
  // Frame 11
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.6,y:0.5,z:-0.4},{x:0.65,y:0.5,z:-0.4},{x:0.58,y:0.6,z:-0.38},{x:0.67,y:0.6,z:-0.38},{x:0.56,y:0.7,z:-0.35},{x:0.69,y:0.7,z:-0.35},null,null,null,null,null,null,{x:0.61,y:0.75,z:-0.3},{x:0.64,y:0.75,z:-0.3},{x:0.6,y:0.9,z:-0.2},{x:0.65,y:0.9,z:-0.2},{x:0.58,y:1.0,z:-0.1},{x:0.67,y:1.0,z:-0.1},null,null,null,null],
  // Frame 12
  [null,null,null,null,null,null,null,null,null,null,null,{x:0.61,y:0.51,z:-0.41},{x:0.66,y:0.51,z:-0.41},{x:0.59,y:0.61,z:-0.39},{x:0.68,y:0.61,z:-0.39},{x:0.57,y:0.71,z:-0.36},{x:0.7,y:0.71,z:-0.36},null,null,null,null,null,null,{x:0.62,y:0.76,z:-0.31},{x:0.65,y:0.76,z:-0.31},{x:0.61,y:0.91,z:-0.21},{x:0.66,y:0.91,z:-0.21},{x:0.59,y:1.01,z:-0.11},{x:0.68,y:1.01,z:-0.11},null,null,null,null]
];

// We use "export" to make this data available to our main script.
export { proTurnData };
