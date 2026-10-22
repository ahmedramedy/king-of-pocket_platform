require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let currentSessionVersion = 1;
const JWT_SECRET = process.env.JWT_SECRET || 'king_of_pocket_secret_key_2026';

const apiId = parseInt(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = new StringSession(process.env.TG_SESSION || '');
const tgClient = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

(async () => {
    try {
        await tgClient.connect();
        console.log('✅ تم الاتصال بحساب تيليجرام بنجاح لمنصة King of Pocket');
    } catch (err) {
        console.error('❌ خطأ في اتصال تيليجرام:', err.message);
    }
})();

// دالة فحص الـ ID عبر بوت التيليجرام واعتماد فحص الرصيد فقط
async function checkIdWithTelegramBot(traderId) {
    try {
        const botUsername = 'AffiliatePocketBot';
        console.log(`\n========================================`);
        console.log(`🔍 [فحص جديد] الـ ID: "${traderId}"`);

        const sentMsg = await tgClient.sendMessage(botUsername, { message: traderId.toString() });

        let botResponseText = null;

        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 600));
            const messages = await tgClient.getMessages(botUsername, { limit: 3 });

            for (const msg of messages) {
                if (!msg.out && msg.id > sentMsg.id && msg.message) {
                    botResponseText = msg.message;
                    break;
                }
            }
            if (botResponseText) break;
        }

        if (!botResponseText) {
            return { valid: false, reason: 'invalid_id', message: 'البوت لا يستجيب حالياً.' };
        }

        // فحص هل الـ ID موجود في رد البوت أساساً (مسجل تحت وكالتك أم لا)
        const hasUid = botResponseText.includes(traderId.toString());
        if (!hasUid) {
            console.log('⛔ مرفوض: الـ ID غير مسجل تحت الوكالة نهائياً.');
            return { 
                valid: false, 
                reason: 'invalid_id', 
                message: 'تسجيلك تم بشكل خاطىء.' 
            };
        }

        // استخراج الرصيد فقط من رد البوت
        const balanceMatch = botResponseText.match(/Balance:\s*\$([0-9.]+)/i);
        const balance = balanceMatch ? parseFloat(balanceMatch[1]) : 0;

        // الشرط: إذا كان الرصيد 0 أو أقل، نطلب منه الإيداع
        if (balance <= 0) {
            console.log('⚠️ الحساب بدون رصيد (تحويل لرسالة الإيداع). الرصيد الحالي: ' + balance);
            return { 
                valid: false, 
                reason: 'low_deposit', 
                message: 'قم بالايداع الان لكي يتم فتح لك المميزات' 
            };
        }

        console.log('✅ مقبول ومؤهل للدخول (يوجد رصيد): $' + balance);
        console.log(`========================================\n`);
        return { valid: true };

    } catch (error) {
        console.error('❌ خطأ فحص:', error.message);
        return { valid: false, reason: 'invalid_id', message: 'خطأ في نظام الفحص الداخلي.' };
    }
}

// مسار تسجيل الدخول
app.post('/api/login-by-id', async (req, res) => {
    const { traderId } = req.body;
    if (!traderId) return res.status(400).json({ success: false, message: 'يرجى إدخال رقم الـ ID' });

    const checkResult = await checkIdWithTelegramBot(traderId);
    if (!checkResult.valid) {
        return res.status(403).json({ 
            success: false, 
            reason: checkResult.reason, 
            message: checkResult.message 
        });
    }

    const token = jwt.sign({ traderId, sessionVersion: currentSessionVersion }, JWT_SECRET);
    return res.json({ success: true, token });
});

// مسار التحقق من الجلسة
app.post('/api/verify-session', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ valid: false });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.sessionVersion === currentSessionVersion) {
            return res.json({ valid: true, traderId: decoded.traderId });
        }
        return res.status(401).json({ valid: false });
    } catch {
        return res.status(401).json({ valid: false });
    }
});

// مسار تحميل المؤشر (يرسل الملف الموجود في مجلد downloads مباشرة)
app.get('/api/download-indicator', (req, res) => {
    const downloadsDir = path.join(__dirname, 'public', 'downloads');
    if (fs.existsSync(downloadsDir)) {
        const files = fs.readdirSync(downloadsDir);
        if (files.length > 0) {
            const filePath = path.join(downloadsDir, files[0]);
            return res.download(filePath, files[0]);
        }
    }
    return res.status(404).send('ملف المؤشر غير موجود.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 سيرفر King of Pocket يعمل الآن على: http://localhost:${PORT}`));