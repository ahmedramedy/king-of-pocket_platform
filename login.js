require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const apiId = parseInt(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = new StringSession('');

(async () => {
    console.log('🔄 جاري توليد QR Code لتسجيل الدخول...');
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.connect();

    await client.signInQrCode({
        qrCode: async (code) => {
            console.log('\n📱 افتح تطبيق تيليجرام على هاتفك -> الإعدادات -> الأجهزة -> اربط جهاز (Link Desktop Device)');
            console.log('امسح الـ QR Code التالي من خلال تطبيق الهاتف:\n');
            code.print();
        },
        password: async () => {
            const input = require('input');
            return await input.text('🔒 أدخل كلمة مرور التحقق بخطوتين (2FA) إن وجدت: ');
        },
        onError: (err) => console.log(err),
    });

    console.log('\n✅ تم تسجيل الدخول بنجاح عبر QR Code!');
    console.log('\nانسخ الكود التالي وضعه داخل ملف .env أمام TG_SESSION:\n');
    console.log(`TG_SESSION="${client.session.save()}"\n`);
    process.exit(0);
})();