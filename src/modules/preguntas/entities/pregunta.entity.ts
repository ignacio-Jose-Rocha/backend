import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TiposRespuestaEnum } from '../enums/tipos-respuesta.enum';
import { Encuesta } from '../../encuestas/entities/encuesta.entity';
import { Opcion } from './opcion.entity';

@Entity({ name: 'preguntas' })
export class Pregunta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  numero: number;

  @Column()
  texto: string;

  @Column({ type: 'enum', enum: TiposRespuestaEnum })
  tipo_respuesta: TiposRespuestaEnum;

  @ManyToOne(() => Encuesta, (encuesta) => encuesta.preguntas)
  @JoinColumn({ name: 'id_encuesta' })
  encuesta: Encuesta;

  @OneToMany(() => Opcion, (opcion) => opcion.pregunta, { cascade: ['insert'] })
  opciones: Opcion[];
}
