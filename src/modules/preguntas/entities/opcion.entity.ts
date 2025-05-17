import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Pregunta } from './pregunta.entity';

@Entity({ name: 'opciones' })
export class Opcion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  texto: string;

  @Column()
  numero: number;

  @ManyToOne(() => Pregunta, (pregunta) => pregunta.opciones)
  @JoinColumn({ name: 'id_pregunta' })
  @Exclude()
  pregunta: Pregunta;
}
