import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Encuesta } from '../entities/encuesta.entity';
import { CreateEncuestaDto } from '../dtos/create-encuesta.dto';
import { v4 } from 'uuid';
import { UpdateEncuestaDto } from '../dtos/update-encuesta.dto';
import { CodigoTipoEnum } from '../enums/codigo-tipo.enum';
import { Pregunta } from '../entities/pregunta.entity';
import { Opcion } from '../../opciones/entities/option.entity';

@Injectable()
export class EncuestasService {
  constructor(
    @InjectRepository(Encuesta)
    private encuestaRepository: Repository<Encuesta>,
    @InjectRepository(Pregunta)
    private preguntaRepository: Repository<Pregunta>,
    @InjectRepository(Opcion)
    private opcionRepository: Repository<Opcion>,
  ) {}

  async crearEncuesta(dto: CreateEncuestaDto): Promise<{
  id: number;
  codigoRespuesta: string;
  codigoResultados: string;
}> {
  // Crear la encuesta con cascada
  const encuesta = this.encuestaRepository.create({
    nombre: dto.nombre,
    codigoRespuesta: v4(),
    codigoResultados: v4(),
    habilitada: true,
    fechaVencimiento: dto.fechaVencimiento, // Mantenemos fechaVencimiento
    preguntas: dto.preguntas.map(preguntaDto => ({
      numero: preguntaDto.numero,
      texto: preguntaDto.texto,
      tipoRespuesta: preguntaDto.tipo_respuesta, // Asegúrate que coincidan los nombres
      opciones: preguntaDto.opciones ? preguntaDto.opciones.map(opcionDto => ({
        texto: opcionDto.texto,
        numero: opcionDto.numero
      })) : []
    }))
  });

  // Guardar todo en cascada
  const encuestaCreada = await this.encuestaRepository.save(encuesta);

  return {
    id: encuestaCreada.id,
    codigoRespuesta: encuestaCreada.codigoRespuesta,
    codigoResultados: encuestaCreada.codigoResultados
  };
}

  async obtenerEncuesta(
    id: number,
    codigo: string,
    codigoTipo: CodigoTipoEnum,
  ): Promise<Encuesta> {
    const query = this.encuestaRepository
      .createQueryBuilder('encuesta')
      .innerJoinAndSelect('encuesta.preguntas', 'pregunta')
      .leftJoinAndSelect('pregunta.opciones', 'preguntaOpcion')
      .where('encuesta.id = :id', { id })
      .andWhere('encuesta.habilitada = true');

    if (codigoTipo === CodigoTipoEnum.RESPUESTA) {
      query.andWhere('encuesta.codigoRespuesta = :codigo', { codigo });
    } else {
      query.andWhere('encuesta.codigoResultados = :codigo', { codigo });
    }

    query.orderBy('pregunta.numero', 'ASC');
    query.addOrderBy('preguntaOpcion.numero', 'ASC');

    const encuesta = await query.getOne();

    if (!encuesta) {
      throw new BadRequestException('Datos de encuesta no válidos');
    }

    if (encuesta.fechaVencimiento && new Date() > encuesta.fechaVencimiento) {
      throw new BadRequestException('La encuesta ha expirado');
    }

    return encuesta;
  }

  async actualizarEstadoEncuesta(
    id: number,
    habilitada: boolean,
  ): Promise<{ mensaje: string }> {
    const encuesta = await this.encuestaRepository.findOne({ where: { id } });

    if (!encuesta) {
      throw new NotFoundException('Encuesta no encontrada');
    }

    encuesta.habilitada = habilitada;
    await this.encuestaRepository.save(encuesta);

    return {
      mensaje: `La encuesta fue ${habilitada ? 'habilitada' : 'deshabilitada'} correctamente`,
    };
  }

  async actualizarEncuesta(
    id: number,
    dto: UpdateEncuestaDto,
  ): Promise<Encuesta> {
    const encuesta = await this.encuestaRepository.findOne({ where: { id } });

    if (!encuesta) {
      throw new NotFoundException('Encuesta no encontrada');
    }

    const encuestaActualizada = await this.encuestaRepository.save({
      ...encuesta,
      ...dto,
    });

    return encuestaActualizada;
  }
}
