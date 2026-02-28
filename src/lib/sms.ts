import { db } from '@/lib/db';

interface SendSMSParams {
  to: string;  // Phone number in format 2519XXXXXXXX
  message: string;
}

interface SMSResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Send SMS using SMSEthiopia API
 * Documentation: https://smsethiopia.et/api/
 */
export async function sendSMS({ to, message }: SendSMSParams): Promise<SMSResponse> {
  try {
    // Get SMS settings from database
    const settings = await db.systemSettings.findFirst();
    
    if (!settings?.smsApiKey) {
      return {
        success: false,
        message: 'SMS API key not configured',
        error: 'SMS_API_KEY_MISSING',
      };
    }

    if (!settings.smsNotificationEnabled) {
      return {
        success: false,
        message: 'SMS notifications are disabled',
        error: 'SMS_DISABLED',
      };
    }

    // Format phone number - ensure it starts with 251
    let formattedPhone = to.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '251' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('251')) {
      formattedPhone = '251' + formattedPhone;
    }

    // Validate phone number format (Ethiopian numbers)
    if (!/^2519\d{8}$/.test(formattedPhone)) {
      return {
        success: false,
        message: 'Invalid phone number format. Must be Ethiopian number (09XXXXXXXX or 2519XXXXXXXX)',
        error: 'INVALID_PHONE_FORMAT',
      };
    }

    // Truncate message if longer than 160 characters
    const smsMessage = message.length > 160 ? message.substring(0, 157) + '...' : message;

    const response = await fetch(`${settings.smsBaseUrl}sms/send`, {
      method: 'POST',
      headers: {
        'KEY': settings.smsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msisdn: formattedPhone,
        text: smsMessage,
      }),
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      return {
        success: true,
        message: 'SMS sent successfully',
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to send SMS',
        error: 'SMS_SEND_FAILED',
      };
    }
  } catch (error) {
    console.error('SMS Error:', error);
    return {
      success: false,
      message: 'Failed to send SMS',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Send invoice notification SMS to tenant
 */
export async function sendInvoiceSMS(
  tenantPhone: string,
  tenantName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: Date
): Promise<SMSResponse> {
  const message = `Dear ${tenantName}, Invoice #${invoiceNumber} for ${amount.toLocaleString()} ETB is due on ${dueDate.toLocaleDateString()}. - Ethiopia Property Mgmt`;
  
  return sendSMS({ to: tenantPhone, message });
}

/**
 * Send payment confirmation SMS to tenant
 */
export async function sendPaymentConfirmationSMS(
  tenantPhone: string,
  tenantName: string,
  amount: number,
  receiptNumber: string
): Promise<SMSResponse> {
  const message = `Dear ${tenantName}, Payment of ${amount.toLocaleString()} ETB received. Receipt: ${receiptNumber}. Thank you! - Ethiopia Property Mgmt`;
  
  return sendSMS({ to: tenantPhone, message });
}

/**
 * Send contract status SMS to tenant
 */
export async function sendContractStatusSMS(
  tenantPhone: string,
  tenantName: string,
  status: string,
  propertyName: string
): Promise<SMSResponse> {
  const statusMessages: Record<string, string> = {
    ACTIVE: `Dear ${tenantName}, Your contract for ${propertyName} is now ACTIVE. Welcome!`,
    TERMINATED: `Dear ${tenantName}, Your contract for ${propertyName} has been terminated.`,
    UNDER_REVIEW: `Dear ${tenantName}, Your contract for ${propertyName} is under review.`,
  };

  const message = statusMessages[status] || `Dear ${tenantName}, Contract status: ${status}`;
  
  return sendSMS({ to: tenantPhone, message });
}

/**
 * Send overdue payment reminder SMS
 */
export async function sendOverdueReminderSMS(
  tenantPhone: string,
  tenantName: string,
  invoiceNumber: string,
  amount: number,
  daysOverdue: number
): Promise<SMSResponse> {
  const message = `Dear ${tenantName}, Invoice #${invoiceNumber} (${amount.toLocaleString()} ETB) is ${daysOverdue} days overdue. Please pay promptly. - Ethiopia Property Mgmt`;
  
  return sendSMS({ to: tenantPhone, message });
}

/**
 * Test SMS configuration by sending a test message
 */
export async function testSMSConfiguration(testPhone: string): Promise<SMSResponse> {
  const message = `Test SMS from Ethiopia Property Management System. Configuration successful!`;
  
  return sendSMS({ to: testPhone, message });
}
