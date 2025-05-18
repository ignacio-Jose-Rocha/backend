import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Pregunta } from './pregunta.entity';

@Entity({ name: 'encuestas' })
export class Encuesta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ name: 'codigo_respuesta' })
  codigoRespuesta: string;

  @Column({ name: 'codigo_resultados' })
  codigoResultados: string;

  @Column({ default: true })
  habilitada: boolean;

  @Column({ name: 'fecha_vencimiento', nullable: true })
  fechaVencimiento: Date;

  @Column({ default: false })
  publica: boolean;

  @Column({ nullable: true })
  categoria: string;

  @Column({ name: 'email_creador', nullable: true })
  emailCreador: string;

  @OneToMany(() => Pregunta, (pregunta) => pregunta.encuesta, {
    cascade: ['insert'],
  })
  preguntas: Pregunta[];
}
