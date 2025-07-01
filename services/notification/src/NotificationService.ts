import axios from 'axios';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

export interface NotificationRequest {
  type: 'alert' | 'info' | 'warning' | 'emergency';
  channel: 'slack' | 'line' | 'sms' | 'email' | 'console';
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
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates');
    if (!fs.existsSync(templatesDir)) {
      console.log('Templates directory not found, using default templates');
      this.createDefaultTemplate();
      return;
    }

    try {
      const templateFiles = fs.readdirSync(templatesDir);
      templateFiles.forEach(file => {
        if (file.endsWith('.hbs')) {
          const templateName = file.replace('.hbs', '');
          const templateContent = fs.readFileSync(path.join(templatesDir, file), 'utf8');
          this.templates.set(templateName, Handlebars.compile(templateContent));
        }
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      this.createDefaultTemplate();
    }
  }

  private createDefaultTemplate() {
    const defaultTemplate = `🚚❄️ Ice Truck Alert
Type: {{type}}
Message: {{message}}
Time: {{timestamp}}`;
    this.templates.set('default', Handlebars.compile(defaultTemplate));
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    const template = this.templates.get(request.template) || this.templates.get('default');
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
        case 'console':
        default:
          console.log(`[${request.type.toUpperCase()}] ${message}`);
          break;
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
    if (!webhook.startsWith('http')) {
      console.log(`[SLACK] ${message}`);
      return;
    }

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
    if (!token || token === 'demo') {
      console.log(`[LINE] ${message}`);
      return;
    }

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
    console.log(`[SMS to ${to}] ${message}`);
  }

  private async sendEmail(to: string, message: string, subject: string) {
    console.log(`[EMAIL to ${to}] Subject: ${subject}\n${message}`);
  }

  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}