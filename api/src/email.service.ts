import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly enabled: boolean;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@jnconta.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'JnConta';
    this.enabled = !!apiKey && !apiKey.startsWith('SG.XXXX');

    if (this.enabled) {
      sgMail.setApiKey(apiKey!);
      this.logger.log('SendGrid configurado correctamente.');
    } else {
      this.logger.warn('SENDGRID_API_KEY no configurado — emails se loggean en consola.');
    }
  }

  private year = new Date().getFullYear();

  private headerHtml(title: string) {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#070B14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070B14;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0D1929;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
<h1 style="margin:0;color:#fff;font-size:26px;font-weight:900;">
<span style="color:#0ea5e9">JN</span><span style="color:#22d3ee">Conta</span></h1>
<p style="margin:4px 0 0;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:0.3em;">${title}</p>
</td></tr>`;
  }

  private footerHtml() {
    return `<tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
<p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">
JnConta &middot; jnconta.com &middot; &copy; ${this.year}</p></td></tr>
</table></td></tr></table></body></html>`;
  }

  async sendPasswordReset(toEmail: string, resetUrl: string): Promise<void> {
    const subject = 'Restablece tu contraseña — JnConta';
    const html = this.headerHtml('Sistema Contable Integral') + `
<tr><td style="padding:40px;">
<h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 12px;">Solicitud de restablecimiento de contraseña</h2>
<p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.7;margin:0 0 28px;">
Recibimos una solicitud para restablecer la contraseña de tu cuenta en JnConta.
Si no fuiste tú, puedes ignorar este mensaje.
</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0ea5e9,#06b6d4);color:#fff;font-weight:900;font-size:13px;text-decoration:none;border-radius:10px;text-transform:uppercase;letter-spacing:0.05em;">
Restablecer Contraseña</a></td></tr></table>
<p style="color:rgba(255,255,255,0.3);font-size:12px;margin:24px 0 0;text-align:center;">Este enlace expira en <strong style="color:rgba(255,255,255,0.5);">1 hora</strong>.</p>
<div style="margin-top:28px;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
<p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 6px;">Si el botón no funciona, copia y pega este enlace:</p>
<p style="color:#06b6d4;font-size:11px;margin:0;word-break:break-all;">${resetUrl}</p></div>
</td></tr>` + this.footerHtml();

    await this.send(toEmail, subject, html, `Reset password URL: ${resetUrl}`);
  }

  async sendWelcome(toEmail: string, userName: string, companyName: string): Promise<void> {
    const subject = `Bienvenido a JnConta, ${userName}`;
    const html = this.headerHtml('¡Cuenta creada exitosamente!') + `
<tr><td style="padding:40px;">
<h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 16px;">¡Bienvenido, ${userName}! 🎉</h2>
<p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.7;margin:0 0 20px;">
Tu empresa <strong style="color:#22d3ee">${companyName}</strong> ya está lista en JnConta.
Tienes <strong style="color:#22d3ee">14 días de prueba gratuita</strong> para explorar todas las funciones.
</p>
<ul style="color:rgba(255,255,255,0.6);font-size:14px;line-height:2;padding-left:20px;">
<li>✅ Contabilidad CFDI 4.0</li>
<li>✅ Nómina ISR 2024 · IMSS · INFONAVIT</li>
<li>✅ Timbrado electrónico SAT</li>
<li>✅ IA Contable con Gemini</li>
</ul>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td align="center">
<a href="https://jnconta.com" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0ea5e9,#06b6d4);color:#fff;font-weight:900;font-size:13px;text-decoration:none;border-radius:10px;text-transform:uppercase;letter-spacing:0.05em;">
Ingresar al Sistema</a></td></tr></table>
</td></tr>` + this.footerHtml();

    await this.send(toEmail, subject, html, `Bienvenida a: ${companyName}`);
  }

  async sendInvoiceEmail(invoiceId: string): Promise<{ invoiceId: string }> {
    // Placeholder — en producción busca la factura, obtiene el email del cliente y envía el PDF
    this.logger.log(`[EMAIL] Factura ${invoiceId} enviada por email (placeholder).`);
    return { invoiceId };
  }

  private async send(toEmail: string, subject: string, html: string, logMsg: string): Promise<void> {
    if (!this.enabled) {
      this.logger.log(`[EMAIL-MOCK] Para: ${toEmail} | ${logMsg}`);
      return;
    }
    try {
      await sgMail.send({ to: toEmail, from: { email: this.fromEmail, name: this.fromName }, subject, html });
      this.logger.log(`Email enviado a: ${toEmail} — ${subject}`);
    } catch (err: any) {
      this.logger.error(`Error enviando email a ${toEmail}: ${err?.message}`);
    }
  }
}
