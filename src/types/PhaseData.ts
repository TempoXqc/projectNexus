export interface PhaseData {
  phase: 'Standby' | 'Main' | 'Battle' | 'End';
  turn: number;
  nextPlayerId?: number;
}