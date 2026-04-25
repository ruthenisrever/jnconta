import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { IaService } from './ia.service';

@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Post('chat')
  async chat(
    @Body() body: { companyId: string; history: any[]; message: string }
  ) {
    const { companyId, history, message } = body;
    if (!companyId || !message) {
      throw new HttpException('Parámetros compañía o mensaje incompletos.', HttpStatus.BAD_REQUEST);
    }
    
    try {
      return await this.iaService.respondToChat(companyId, history || [], message);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Error interno al procesar la IA',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('predict')
  async predict(@Body() body: { companyId: string }) {
    if (!body.companyId) throw new HttpException('companyId es requerido', HttpStatus.BAD_REQUEST);
    return await this.iaService.predictNextMonthTaxes(body.companyId);
  }

  @Post('anomalies')
  async anomalies(@Body() body: { companyId: string }) {
    if (!body.companyId) throw new HttpException('companyId es requerido', HttpStatus.BAD_REQUEST);
    return await this.iaService.auditAnomalies(body.companyId);
  }
}
