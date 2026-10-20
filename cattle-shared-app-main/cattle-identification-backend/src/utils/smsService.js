const https = require('https');

/**
 * SMS Service - 2Factor.in OTP Gateway
 * API: GET https://2factor.in/API/V1/{api_key}/SMS/{phone}/{otp}
 * Response: { "Status": "Success", "Details": "<session_id>" }
 *           { "Status": "Error",   "Details": "<reason>" }
 */

class SMSService {
  constructor() {
    this.apiKey = process.env.TWO_FACTOR_API_KEY;
    console.log('📱 SMS Service initialized with 2Factor.in');
  }

  /**
   * Send OTP via 2Factor.in
   * @param {string} phoneNumber - 10-digit Indian mobile number (with or without +91/91 prefix)
   * @param {string|number} otp - OTP code to deliver
   * @returns {Promise<{ success: boolean, sessionId?: string, error?: string }>}
   */
  _send2FactorOTP(phoneNumber, otp) {
    return new Promise((resolve, reject) => {
      // Normalise to 10-digit number
      const cleanNumber = String(phoneNumber)
        .replace(/^\+91|^91|^0/, '')
        .replace(/\D/g, '');

      const url = `https://2factor.in/API/V1/${this.apiKey}/SMS/${cleanNumber}/${otp}`;

      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.Status === 'Success') {
              resolve({ success: true, sessionId: parsed.Details });
            } else {
              reject(new Error(parsed.Details || 'SMS sending failed'));
            }
          } catch {
            reject(new Error('Invalid response from 2Factor API'));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Send OTP for mobile verification (after signup)
   */
  async sendOTP(phoneNumber, otp) {
    try {
      const result = await this._send2FactorOTP(phoneNumber, otp);
      console.log(`📱 OTP sent to ${phoneNumber} via 2Factor.in (session: ${result.sessionId})`);
      return { success: true, sessionId: result.sessionId };
    } catch (error) {
      console.error('❌ SMS OTP sending failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send OTP for login
   */
  async sendLoginOTP(phoneNumber, otp) {
    return await this.sendOTP(phoneNumber, otp);
  }

  /**
   * Send OTP for password reset
   */
  async sendPasswordResetOTP(phoneNumber, otp) {
    return await this.sendOTP(phoneNumber, otp);
  }
}

module.exports = new SMSService();
