const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

const apiId = 37521944; // الـ API ID الخاص بك
const apiHash = "6e7d4935b794ac2c99801ed5ea8f9f5a"; // الـ API HASH الخاص بك

(async () => {
    const client = new TelegramClient(new StringSession(""), apiId, apiHash, {});
    await client.start({
        phoneNumber: async () => await input.text("أدخل رقم هاتفك: "),
        password: async () => await input.text("كلمة المرور 2FA (إن وجدت): "),
        phoneCode: async () => await input.text("كود تيليجرام: "),
        onError: (err) => console.log(err),
    });
    console.log("\nتم تسجيل الدخول بنجاح! انسخ كود الجلسة التالي:");
    console.log(client.session.save());
    process.exit(0);
})();