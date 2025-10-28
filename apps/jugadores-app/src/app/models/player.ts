export interface Player {
  id?: number;
  nombre: string;
  apellido: string;
  equipo?: string;
  descripcion?: string;
  estado: 'presente' | 'ausencia_injustificada' | 'ausencia_justificada' | 'vacaciones';
}