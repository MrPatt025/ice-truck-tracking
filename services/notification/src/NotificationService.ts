import axios from 'axios';
import twilio from 'twilio';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

export interface NotificationRequest {
  type: 'alert' | 'info' | 'warning' | 'emergency';
  channel: 'slack' | 'line' | 'sms' | 'email';
  recipient: string;
  template: string;
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface NotificationResult {
  messageId: string;
  status: 'sent' | 'failed';
  timestamp: string;
  channel: string;
}

export class NotificationService {
  private twilioClient: twilio.Twilio;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.loadTemplates();
  }

  private loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates');
    const templateFiles = fs.readdirSync(templatesDir);

    templateFiles.forEach(file => {
      if (file.endsWith('.hbs')) {
        const templateName = file.replace('.hbs', '');
        const templateContent = fs.readFileSync(path.join(templatesDir, file), 'utf8');
        this.templates.set(templateName, Handlebars.compile(templateContent));
      }
    });
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    const template = this.templates.get(request.template);
    if (!template) {
      throw new Error(`Template ${request.template} not found`);
    }

    const message = template(request.data);
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      switch (request.channel) {
        case 'slack':
          await this.sendSlack(request.recipient, message, request.type);
          break;
        case 'line':
          await this.sendLine(request.recipient, message);
          break;
        case 'sms':
          await this.sendSMS(request.recipient, message);
          break;
        case 'email':
          await this.sendEmail(request.recipient, message, request.data.subject || 'Ice Truck Alert');
          break;
        default:
          throw new Error(`Unsupported channel: ${request.channel}`);
      }

      return {
        messageId,
        status: 'sent',
        timestamp: new Date().toISOString(),
        channel: request.channel,
      };
    } catch (error) {
      console.error(`Failed to send ${request.channel} notification:`, error);
      return {
        messageId,
        status: 'failed',
        timestamp: new Date().toISOString(),
        channel: request.channel,
      };
    }
  }

  private async sendSlack(webhook: string, message: string, type: string) {
    const color = {
      alert: '#ff0000',
      warning: '#ffaa00',
      info: '#0099ff',
      emergency: '#cc0000',
    }[type] || '#0099ff';

    await axios.post(webhook, {
      attachments: [{
        color,
        text: message,
        footer: 'Ice Truck Tracking System',
        ts: Math.floor(Date.now() / 1000),
      }],
    });
  }

  private async sendLine(token: string, message: string) {
    await axios.post('https://notify-api.line.me/api/notify', 
      `message=${encodeURIComponent(message)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
  }

  private async sendSMS(to: string, message: string) {
    await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
  }

  private async sendEmail(to: string, message: string, subject: string) {
    // Using AWS SES or similar service
    await axios.post(`${process.env.EMAIL_SERVICE_URL}/send`, {
      to,
      subject,
      html: message,
      from: process.env.FROM_EMAIL,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.EMAIL_SERVICE_TOKEN}`,
      },
    });
  }

  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}