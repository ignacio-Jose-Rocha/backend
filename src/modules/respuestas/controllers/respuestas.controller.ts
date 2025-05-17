import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RespuestasService } from '../services/respuestas.service';
import { RegistrarRespuestasDto } from '../dtos/registrar-respuestas.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('respuestas')
@Controller('respuestas')
export class RespuestasController {
  constructor(private readonly respuestasService: RespuestasService) {}

  @Post(':tokenParticipacion')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar respuestas' })
  @ApiParam({
    name: 'tokenParticipacion',
    description: 'Token de participación',
    example: 'abc123def456',
  })
  @ApiBody({ type: RegistrarRespuestasDto })
  @ApiResponse({
    status: 201,
    description: '¡Respuestas registradas con éxito!',
  })
  @ApiResponse({
    status: 404,
    description: 'Error: encuesta no encontrada o enlace inválido',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de respuesta inválidos',
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
}
