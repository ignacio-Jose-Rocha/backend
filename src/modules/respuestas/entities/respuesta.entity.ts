import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Encuesta } from '../../encuestas/entities/encuesta.entity';
import { RespuestaAbierta } from './respuesta-abierta.entity';
import { RespuestaOpcion } from './respuesta-opcion.entity';

@Entity('respuestas')
export class Respuesta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_encuesta' })
  idEncuesta: number;

  @ManyToOne(() => Encuesta)
  @JoinColumn({ name: 'id_encuesta' })
  encuesta: Encuesta;

  @Column({
    name: 'fecha_creacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

@OneToMany(() => RespuestaAbierta, (ra) => ra.respuesta, { cascade: true })
respuestasAbiertas: RespuestaAbierta[];

@OneToMany(() => RespuestaOpcion, (ro) => ro.respuesta, { cascade: true })
respuestasOpciones: RespuestaOpcion[];

}
