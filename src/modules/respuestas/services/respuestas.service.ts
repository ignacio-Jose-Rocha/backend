import {
  Injectable,
  NotFoundException,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
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
  // Verificar encuesta
  const encuesta = await this.encuestaRepository.findOne({
    where: { codigoRespuesta: codigoParticipacion },
    relations: ['preguntas', 'preguntas.opciones']
  });

  if (!encuesta) {
    throw new NotFoundException('Encuesta no encontrada o enlace inválido');
  }

  // Validar estado de la encuesta
  if (encuesta.fechaVencimiento && new Date() > encuesta.fechaVencimiento) {
    throw new BadRequestException('La encuesta ha expirado y no acepta más respuestas');
  }

  if (!encuesta.habilitada) {
    throw new BadRequestException('La encuesta no está habilitada');
  }

  // Crear la respuesta principal
  const respuesta = this.respuestaRepository.create({
    idEncuesta: encuesta.id,
  });
  const respuestaGuardada = await this.respuestaRepository.save(respuesta);

  // Procesar cada respuesta
  for (const respuestaPregunta of registrarRespuestasDto.respuestas) {
    const pregunta = encuesta.preguntas.find(p => p.id === respuestaPregunta.id_pregunta);
    
    if (!pregunta) {
      throw new BadRequestException(`Pregunta ${respuestaPregunta.id_pregunta} no encontrada`);
    }

    // Validar tipo de respuesta
    if (pregunta.tipoRespuesta !== respuestaPregunta.tipo) {
      throw new BadRequestException(`Tipo de respuesta no coincide para la pregunta ${pregunta.id}`);
    }

    // Procesar según el tipo de pregunta
    switch (pregunta.tipoRespuesta) {
      case TiposRespuestaEnum.ABIERTA:
        if (!respuestaPregunta.texto) {
          throw new BadRequestException('Texto de respuesta requerido para pregunta abierta');
        }
        
        const respuestaAbierta = this.respuestaAbiertaRepository.create({
          texto: respuestaPregunta.texto,
          id_pregunta: pregunta.id,
          id_respuesta: respuestaGuardada.id,
        });
        await this.respuestaAbiertaRepository.save(respuestaAbierta);
        break;

      case TiposRespuestaEnum.VERDADERO_FALSO:
      case TiposRespuestaEnum.OPCION_MULTIPLE_SELECCION_SIMPLE:
        if (!respuestaPregunta.opciones || respuestaPregunta.opciones.length !== 1) {
          throw new BadRequestException('Debe seleccionar exactamente una opción');
        }
        // Continuar con el procesamiento de opciones

      case TiposRespuestaEnum.OPCION_MULTIPLE_SELECCION_MULTIPLE:
        if (!respuestaPregunta.opciones || respuestaPregunta.opciones.length === 0) {
          throw new BadRequestException('Debe seleccionar al menos una opción');
        }

        // Verificar que las opciones pertenezcan a la pregunta
        const opcionesValidas = pregunta.opciones.map(op => op.id);
        const opcionesInvalidas = respuestaPregunta.opciones.filter(
          opId => !opcionesValidas.includes(opId)
        );

        if (opcionesInvalidas.length > 0) {
          throw new BadRequestException(`Opciones no válidas: ${opcionesInvalidas.join(', ')}`);
        }

        // Guardar cada opción seleccionada
        for (const opcionId of respuestaPregunta.opciones) {
          const respuestaOpcion = this.respuestaOpcionRepository.create({
            id_respuesta: respuestaGuardada.id,
            id_opcion: opcionId,
          });
          await this.respuestaOpcionRepository.save(respuestaOpcion);
        }
        break;

      default:
        throw new BadRequestException(`Tipo de pregunta no soportado: ${pregunta.tipoRespuesta}`);
    }
  }
}

async exportarRespuestasCSV(
  idEncuesta: number,
  codigoResultados: string,
): Promise<string> {
  // Obtener encuesta con preguntas y opciones
  const encuesta = await this.encuestaRepository.findOne({
    where: { 
      id: idEncuesta,
      codigoResultados 
    },
    relations: {
      preguntas: {
        opciones: true
      }
    },
    order: {
      preguntas: {
        numero: 'ASC'
      }
    }
  });

  if (!encuesta) {
    throw new NotFoundException('Encuesta no encontrada o código inválido');
  }

  // Obtener todas las respuestas con sus relaciones
  const respuestas = await this.respuestaRepository.find({
    where: { idEncuesta },
    relations: {
      respuestasAbiertas: {
        pregunta: true
      },
      respuestasOpciones: {
        opcion: {
          pregunta: true
        }
      }
    },
    order: { fechaCreacion: 'ASC' }
  });

  // Preparar encabezados
  const headers = [
    'ID Respuesta',
    'Fecha',
    ...encuesta.preguntas.map(p => `P${p.numero}: ${p.texto}`)
  ];

  // Preparar filas de datos
  const rows = respuestas.map(respuesta => {
    const row = [
      respuesta.id,
      respuesta.fechaCreacion.toISOString()
    ];

    // Para cada pregunta, buscar la respuesta correspondiente
    encuesta.preguntas.forEach(pregunta => {
      let valor = '';

      // Buscar respuesta abierta
      const respuestaAbierta = respuesta.respuestasAbiertas?.find(
        ra => ra.id_pregunta === pregunta.id
      );

      // Buscar respuestas de opciones
      const respuestasOpciones = respuesta.respuestasOpciones?.filter(
        ro => ro.opcion.pregunta.id === pregunta.id
      );

      // Asignar valor según el tipo de pregunta
      if (respuestaAbierta) {
        valor = respuestaAbierta.texto;
      } else if (respuestasOpciones?.length) {
        // Para opciones múltiples, concatenar los textos
        const textosOpciones = respuestasOpciones.map(ro => 
          ro.opcion.texto
        );
        valor = textosOpciones.join('; ');
      }

      row.push(valor);
    });

    return row;
  });

  // Generar contenido CSV
  let csvContent = headers.join(',') + '\n';
  rows.forEach(row => {
    csvContent += row.map(value => 
      `"${String(value ?? '').replace(/"/g, '""')}"`
    ).join(',') + '\n';
  });

  return csvContent;
}
}
