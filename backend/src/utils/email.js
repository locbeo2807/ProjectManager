const mailjet = require('node-mailjet').apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_API_SECRET);

/**
 * Gửi email OTP bằng Mailjet
 * @param {string} to - Địa chỉ email nhận
 * @param {string} otp - Mã OTP
 * @returns {Promise}
 */
async function sendOTP(to, otp) {
  const request = mailjet
    .post('send', { version: 'v3.1' })
    .request({
      Messages: [
        {
          From: {
            Email: process.env.MAIL_FROM,
            Name: 'Your App',
          },
          To: [
            {
              Email: to,
              Name: 'User',
            },
          ],
          Subject: 'Mã xác thực OTP',
          TextPart: `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`,
          HTMLPart: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #333;">Xác thực tài khoản</h2>
            <p>Mã OTP của bạn là:</p>
            <div style="font-size: 24px; font-weight: bold; color: #007bff; text-align: center; margin: 20px 0;">${otp}</div>
            <p>Mã này có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này với ai khác.</p>
            <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
          </div>`,
        },
      ],
    });

  try {
    const result = await request;
    return result;
  } catch (error) {
    console.error('Lỗi khi gửi email xác thực:', error.message);
    throw error;
  }
}

module.exports = { sendOTP };