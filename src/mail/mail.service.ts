import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly recipient: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.resend    = new Resend(this.config.getOrThrow<string>('RESEND_API_KEY'));
    this.from      = this.config.get<string>('MAIL_FROM', 'Okonkwo Portal <notifications@uchennaokonkwo.com>');
    this.recipient = this.config.get<string>('MAIL_RECIPIENT', 'kinguchennaokonkwo@gmail.com');
  }

  // ─── Public helpers ───────────────────────────────────────────────────────

  async sendPetitionNotification(petition: {
    id: string;
    topic: string;
    constituentName: string;
    message: string;
    createdAt: Date;
  }): Promise<void> {
    const subject = `[Petition] ${petition.topic}`;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1a1a1a">
        <h2 style="border-bottom:2px solid #e5e7eb;padding-bottom:8px">New Petition Received</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:10px 12px;font-weight:600;width:160px;background:#f9fafb;border:1px solid #e5e7eb">Reference ID</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;font-family:monospace">${petition.id}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-weight:600;background:#f9fafb;border:1px solid #e5e7eb">Topic</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb">${this._escape(petition.topic)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-weight:600;background:#f9fafb;border:1px solid #e5e7eb">From</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb">${this._escape(petition.constituentName)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-weight:600;background:#f9fafb;border:1px solid #e5e7eb">Submitted</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb">${petition.createdAt.toUTCString()}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-weight:600;vertical-align:top;background:#f9fafb;border:1px solid #e5e7eb">Message</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;white-space:pre-wrap;line-height:1.6">${this._escape(petition.message)}</td>
          </tr>
        </table>
      </div>`;

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
      <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1a1a1a">
        <h2 style="border-bottom:2px solid #e5e7eb;padding-bottom:8px">New Feedback Received</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:10px 12px;font-weight:600;width:160px;background:#f9fafb;border:1px solid #e5e7eb">Reference ID</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;font-family:monospace">${feedback.id}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-weight:600;background:#f9fafb;border:1px solid #e5e7eb">Type</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb">
              <span style="background:${color};color:#fff;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:600">${feedback.type}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-weight:600;background:#f9fafb;border:1px solid #e5e7eb">Submitted</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb">${feedback.createdAt.toUTCString()}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-weight:600;vertical-align:top;background:#f9fafb;border:1px solid #e5e7eb">Message</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;white-space:pre-wrap;line-height:1.6">${this._escape(feedback.message)}</td>
          </tr>
        </table>
      </div>`;

    await this._send(subject, html);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async _send(subject: string, html: string): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from:    this.from,
        to:      this.recipient,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Resend API error for "${subject}": ${error.message}`);
      }
    } catch (err) {
      // Never let mail failure crash the request
      this.logger.error(`Failed to send "${subject}": ${(err as Error).message}`);
    }
  }

  private _escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
