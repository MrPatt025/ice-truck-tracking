import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { NotificationService } from './NotificationService';
import { AuditLogger } from './AuditLogger';

const app = express();
const port = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json());

const notificationService = new NotificationService();
const auditLogger = new AuditLogger();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Send notification
app.post('/api/v1/notify', async (req, res) => {
  try {
    const { type, channel, recipient, template, data, priority = 'normal' } = req.body;

    // Audit log
    await auditLogger.log({
      action: 'notification_request',
      userId: req.headers['x-user-id'] as string,
      details: { type, channel, recipient: recipient.replace(/./g, '*'), template },
      timestamp: new Date().toISOString(),
    });

    const result = await notificationService.send({
      type,
      channel,
      recipient,
      template,
      data,
      priority,
    });

    await auditLogger.log({
      action: 'notification_sent',
      userId: req.headers['x-user-id'] as string,
      details: { messageId: result.messageId, status: result.status },
      timestamp: new Date().toISOString(),
    });

    res.json(result);
  } catch (error: any) {
    console.error('Notification error:', error);
    
    await auditLogger.log({
      action: 'notification_failed',
      userId: req.headers['x-user-id'] as string,
      details: { error: error.message },
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Bulk notifications
app.post('/api/v1/notify/bulk', async (req, res) => {
  try {
    const { notifications } = req.body;
    const results = await Promise.allSettled(
      notifications.map((notification: any) => notificationService.send(notification))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    await auditLogger.log({
      action: 'bulk_notification',
      userId: req.headers['x-user-id'] as string,
      details: { total: notifications.length, successful, failed },
      timestamp: new Date().toISOString(),
    });

    res.json({ total: notifications.length, successful, failed, results });
  } catch (error) {
    console.error('Bulk notification error:', error);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
});

// Get notification templates
app.get('/api/v1/templates', (req, res) => {
  const templates = notificationService.getAvailableTemplates();
  res.json(templates);
});

app.listen(port, () => {
  console.log(`Notification service running on port ${port}`);
});

export default app;