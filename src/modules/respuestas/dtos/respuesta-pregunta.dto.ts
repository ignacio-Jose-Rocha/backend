import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { TiposRespuestaEnum } from '../../encuestas/enums/tipos-respuesta.enum';


export class RespuestaPreguntaDto {
  @IsNumber()
  @IsNotEmpty()
  id_pregunta: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(TiposRespuestaEnum)
  tipo: TiposRespuestaEnum;

  @IsOptional()
  @IsString()
  texto?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  opciones?: number[];
}
