import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  async generarQR(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url);
    } catch (err) {
      throw new Error(
        'Error al generar QR: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  // Opcional: Para guardar QR en archivo (útil para debug)
  async generarQRFile(url: string, path: string): Promise<void> {
    await QRCode.toFile(path, url);
  }
}
