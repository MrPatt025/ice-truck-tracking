import fs from 'fs';
import path from 'path';
import winston from 'winston';

export interface AuditLogEntry {
  action: string;
  userId: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(__dirname, '../../../logs/audit/audit.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../../../logs/audit/error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
        }),
      ],
    });

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }

  async log(entry: AuditLogEntry): Promise<void> {
    // PDPA/GDPR compliance - mask sensitive data
    const sanitizedEntry = this.sanitizeEntry(entry);
    
    this.logger.info('AUDIT', {
      ...sanitizedEntry,
      compliance: {
        dataRetention: '7 years',
        purpose: 'Security and compliance monitoring',
        lawfulBasis: 'Legitimate interest',
      },
    });

    // Store in separate compliance log for regulatory requirements
    await this.storeComplianceLog(sanitizedEntry);
  }

  private sanitizeEntry(entry: AuditLogEntry): AuditLogEntry {
    const sanitized = { ...entry };
    
    // Mask PII data
    if (sanitized.details.recipient) {
      sanitized.details.recipient = this.maskString(sanitized.details.recipient);
    }
    
    if (sanitized.details.phoneNumber) {
      sanitized.details.phoneNumber = this.maskString(sanitized.details.phoneNumber);
    }
    
    if (sanitized.details.email) {
      sanitized.details.email = this.maskEmail(sanitized.details.email);
    }

    return sanitized;
  }

  private maskString(str: string): string {
    if (str.length <= 4) return '*'.repeat(str.length);
    return str.substring(0, 2) + '*'.repeat(str.length - 4) + str.substring(str.length - 2);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${this.maskString(local)}@${domain}`;
  }

  private async storeComplianceLog(entry: AuditLogEntry): Promise<void> {
    const complianceLogPath = path.join(__dirname, '../../../logs/audit/compliance.log');
    const logEntry = JSON.stringify({
      ...entry,
      hash: this.generateHash(entry),
      retention: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 7 years
    }) + '\n';

    fs.appendFileSync(complianceLogPath, logEntry);
  }

  private generateHash(entry: AuditLogEntry): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(entry)).digest('hex');
  }

  async getAuditTrail(userId: string, startDate: string, endDate: string): Promise<AuditLogEntry[]> {
    // Implementation for retrieving audit trail for compliance requests
    // This would typically query a database or parse log files
    return [];
  }
}