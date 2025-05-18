import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncuestasController } from './controllers/encuestas.controller';
import { EncuestasService } from './services/encuestas.service';
import { Encuesta } from './entities/encuesta.entity';
import { Pregunta } from './entities/pregunta.entity';
import { Opcion } from './entities/opcion.entity';
import { QrService } from '../../shared/services/qr.service';

@Module({
  imports: [TypeOrmModule.forFeature([Encuesta, Pregunta, Opcion])],
  controllers: [EncuestasController],
  providers: [EncuestasService, QrService],
  exports: [EncuestasService],
})
export class EncuestasModule {}
