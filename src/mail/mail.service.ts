import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly recipient: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.recipient = this.config.getOrThrow<string>('MAIL_RECIPIENT');

    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('MAIL_HOST'),
      port: this.config.get<number>('MAIL_PORT', 587),
      secure: this.config.get<boolean>('MAIL_SECURE', false), // true for port 465
      auth: {
        user: this.config.getOrThrow<string>('MAIL_USER'),
        pass: this.config.getOrThrow<string>('MAIL_PASSWORD'),
      },
    });
  }

  // ─── Public send helpers ──────────────────────────────────────────────────

  async sendPetitionNotification(petition: {
    id: string;
    topic: string;
    constituentName: string;
    message: string;
    createdAt: Date;
  }): Promise<void> {
    const subject = `[Petition] ${petition.topic}`;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1a1a1a">New Petition Received</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:8px;font-weight:bold;width:160px;background:#f5f5f5">Reference ID</td>
            <td style="padding:8px">${petition.id}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;background:#f5f5f5">Topic</td>
            <td style="padding:8px">${this._escape(petition.topic)}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;background:#f5f5f5">From</td>
            <td style="padding:8px">${this._escape(petition.constituentName)}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;background:#f5f5f5">Submitted</td>
            <td style="padding:8px">${petition.createdAt.toUTCString()}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;vertical-align:top;background:#f5f5f5">Message</td>
            <td style="padding:8px;white-space:pre-wrap">${this._escape(petition.message)}</td>
          </tr>
        </table>
      </div>
    `;

    await this._send(subject, html);
  }

  async sendFeedbackNotification(feedback: {
    id: string;
    type: string;
    message: string;
    createdAt: Date;
  }): Promise<void> {
    const subject = `[Feedback] ${feedback.type}`;

    const badgeColor: Record<string, string> = {
      SUGGESTION: '#2563eb',
      COMPLIMENT: '#16a34a',
      CRITICISM:  '#dc2626',
    };
    const color = badgeColor[feedback.type] ?? '#6b7280';

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1a1a1a">New Feedback Received</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:8px;font-weight:bold;width:160px;background:#f5f5f5">Reference ID</td>
            <td style="padding:8px">${feedback.id}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;background:#f5f5f5">Type</td>
            <td style="padding:8px">
              <span style="background:${color};color:#fff;padding:2px 10px;border-radius:12px;font-size:13px">
                ${feedback.type}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;background:#f5f5f5">Submitted</td>
            <td style="padding:8px">${feedback.createdAt.toUTCString()}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;vertical-align:top;background:#f5f5f5">Message</td>
            <td style="padding:8px;white-space:pre-wrap">${this._escape(feedback.message)}</td>
          </tr>
        </table>
      </div>
    `;

    await this._send(subject, html);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async _send(subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Okonkwo Portal" <${this.config.getOrThrow('MAIL_USER')}>`,
        to: this.recipient,
        subject,
        html,
      });
    } catch (err) {
      // Log but do not throw — a mail failure must never break the HTTP response
      this.logger.error(`Failed to send email "${subject}": ${(err as Error).message}`);
    }
  }

  /** Prevent HTML injection from user-supplied content. */
  private _escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
