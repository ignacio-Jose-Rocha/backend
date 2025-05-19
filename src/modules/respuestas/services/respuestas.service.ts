import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import * as csv from 'csv-writer';
import { Respuesta } from '../entities/respuesta.entity';
import { RespuestaAbierta } from '../entities/respuesta-abierta.entity';
import { RespuestaOpcion } from '../entities/respuesta-opcion.entity';
import { Encuesta } from '../../encuestas/entities/encuesta.entity';
import { Pregunta } from '../../preguntas/entities/pregunta.entity';
import { Opcion } from '../../opciones/entities/option.entity';
import { RegistrarRespuestasDto } from '../dtos/registrar-respuestas.dto';
import { TiposRespuestaEnum } from '../../encuestas/enums/tipos-respuesta.enum';

@Injectable()
export class RespuestasService {
  constructor(
    @InjectRepository(Respuesta)
    private respuestaRepository: Repository<Respuesta>,
    @InjectRepository(RespuestaAbierta)
    private respuestaAbiertaRepository: Repository<RespuestaAbierta>,
    @InjectRepository(RespuestaOpcion)
    private respuestaOpcionRepository: Repository<RespuestaOpcion>,
    @InjectRepository(Encuesta)
    private encuestaRepository: Repository<Encuesta>,
    @InjectRepository(Pregunta)
    private preguntaRepository: Repository<Pregunta>,
    @InjectRepository(Opcion)
    private opcionRepository: Repository<Opcion>,
  ) {}

  async registrarRespuestas(
    codigoParticipacion: string,
    registrarRespuestasDto: RegistrarRespuestasDto,
  ): Promise<void> {
    const encuesta = await this.encuestaRepository.findOne({
      where: { codigoRespuesta: codigoParticipacion },
    });

    if (!encuesta) {
      throw new NotFoundException('Encuesta no encontrada o enlace inválido');
    }

    if (encuesta.fechaVencimiento && new Date() > encuesta.fechaVencimiento) {
      throw new BadRequestException(
        'La encuesta ha expirado y no acepta más respuestas',
      );
    }

    if (!encuesta.habilitada) {
      throw new BadRequestException('La encuesta no está habilitada');
    }

    const respuesta = this.respuestaRepository.create({
      idEncuesta: encuesta.id,
    });
    const respuestaGuardada = await this.respuestaRepository.save(respuesta);

    for (const respuestaPregunta of registrarRespuestasDto.respuestas) {
      const pregunta = await this.preguntaRepository.findOne({
        where: {
          id: respuestaPregunta.id_pregunta,
          encuesta: { id: encuesta.id },
        },
      });

      if (!pregunta) {
        throw new BadRequestException(
          `Pregunta ${respuestaPregunta.id_pregunta} no encontrada o no pertenece a esta encuesta`,
        );
      }

      if (pregunta.tipoRespuesta !== respuestaPregunta.tipo) {
      throw new BadRequestException(
        `El tipo de respuesta no coincide con el tipo de pregunta (esperado: ${pregunta.tipoRespuesta}, recibido: ${respuestaPregunta.tipo})`,
      );
    }
      switch (respuestaPregunta.tipo) {
        case TiposRespuestaEnum.ABIERTA:
          if (!respuestaPregunta.texto) {
            throw new BadRequestException(
              'Respuesta de texto requerida para pregunta abierta',
            );
          }

          const respuestaAbierta = this.respuestaAbiertaRepository.create({
            texto: respuestaPregunta.texto,
            id_pregunta: pregunta.id,
            id_respuesta: respuestaGuardada.id,
          });
          await this.respuestaAbiertaRepository.save(respuestaAbierta);
          break;

        case TiposRespuestaEnum.VERDADERO_FALSO:
          if (!respuestaPregunta.opciones || respuestaPregunta.opciones.length !== 1) {
            throw new BadRequestException(
              'Debe seleccionar exactamente una opción para pregunta verdadero/falso',
            );
          }
          // Continuar con el mismo manejo que opción múltiple simple
          
        case TiposRespuestaEnum.OPCION_MULTIPLE_SELECCION_SIMPLE:
          if (
            !respuestaPregunta.opciones ||
            respuestaPregunta.opciones.length === 0
          ) {
            throw new BadRequestException(
              'Al menos una opción debe ser seleccionada',
            );
          }

          if (respuestaPregunta.opciones.length > 1) {
            throw new BadRequestException(
              'Solo se permite una selección para este tipo de pregunta',
            );
          }
          // Continuar con el manejo de opciones

        case TiposRespuestaEnum.OPCION_MULTIPLE_SELECCION_MULTIPLE:
          if (
            !respuestaPregunta.opciones ||
            respuestaPregunta.opciones.length === 0
          ) {
            throw new BadRequestException(
              'Al menos una opción debe ser seleccionada',
            );
          }
          // Continuar con el manejo de opciones

          for (const idOpcion of respuestaPregunta.opciones) {
            const opcion = await this.opcionRepository.findOne({
              where: {
                id: idOpcion,
                pregunta: { id: pregunta.id },
              },
            });

            if (!opcion) {
              throw new BadRequestException(
                `Opción ${idOpcion} no encontrada o no pertenece a esta pregunta`,
              );
            }

            const respuestaOpcion = this.respuestaOpcionRepository.create({
              id_respuesta: respuestaGuardada.id,
              id_opcion: idOpcion,
            });
            await this.respuestaOpcionRepository.save(respuestaOpcion);
          }
          break;

        default:
          throw new BadRequestException(
            `Tipo de pregunta no soportado: ${respuestaPregunta.tipo}`,
          );
      }
    }
  }

  async exportarRespuestasCSV(
    idEncuesta: number,
    codigoResultados: string,
    res: Response,
  ): Promise<void> {
    // Verificar acceso a los resultados
    const encuesta = await this.encuestaRepository.findOne({
      where: {
        id: idEncuesta,
        codigoResultados: codigoResultados,
      },
    });

    if (!encuesta) {
      throw new NotFoundException('Encuesta no encontrada o código inválido');
    }

    // Obtener todas las preguntas de la encuesta
    const preguntas = await this.preguntaRepository.find({
      where: { encuesta: { id: idEncuesta } },
      order: { numero: 'ASC' },
      relations: ['opciones'],
    });

    // Configurar headers para descarga CSV
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=respuestas-encuesta-${idEncuesta}.csv`,
    );

   
    // Obtener todas las respuestas
    const respuestas = await this.respuestaRepository.find({
      where: { idEncuesta: idEncuesta },
      relations: ['respuestasAbiertas', 'respuestasOpciones', 'respuestasOpciones.opcion'],
    });



    res.end();
  }
}
