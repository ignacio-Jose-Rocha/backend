import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Get,
  Header,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { RespuestasService } from '../services/respuestas.service';
import { RegistrarRespuestasDto } from '../dtos/registrar-respuestas.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Readable } from 'stream';
import { StreamableFile } from '@nestjs/common';
import { Response } from 'express';

@ApiTags('respuestas')
@Controller('respuestas')
export class RespuestasController {
  constructor(private readonly respuestasService: RespuestasService) {}

  @Post(':tokenParticipacion')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar respuestas a una encuesta' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Respuestas registradas exitosamente' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Datos de respuestas inválidos' 
  })
  async registrarRespuestas(
    @Param('tokenParticipacion') tokenParticipacion: string,
    @Body() registrarRespuestasDto: RegistrarRespuestasDto,
  ): Promise<{ message: string }> {
    await this.respuestasService.registrarRespuestas(
      tokenParticipacion,
      registrarRespuestasDto,
    );
    return { message: 'Respuestas registradas exitosamente' };
  }

  @Get(':idEncuesta/exportar/:codigoResultados')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=respuestas.csv')
  @ApiOperation({ summary: 'Exportar respuestas a CSV' })
  @ApiParam({ name: 'idEncuesta', type: Number, description: 'ID de la encuesta' })
  @ApiParam({ 
    name: 'codigoResultados', 
    type: String, 
    description: 'Código de acceso a resultados' 
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Archivo CSV descargado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Encuesta no encontrada o código inválido',
  })
  async exportarRespuestasCSV(
  @Param('idEncuesta', ParseIntPipe) idEncuesta: number,
  @Param('codigoResultados') codigoResultados: string,
  @Res() res: Response
): Promise<void> {
  try {
    const csvContent = await this.respuestasService.exportarRespuestasCSV(
      idEncuesta,
      codigoResultados
    );

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename=respuestas_${idEncuesta}_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error al generar CSV:', error);
    throw error;
  }
}
}
