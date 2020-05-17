const TelegramBot = require('node-telegram-bot-api');
const token = '1214475671:AAE4mA9NpqMU7DR3dzUSMva3z_z-OVDwiAQ';
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/start/, msg =>{
    bot.sendMessage(msg.chat.id,'Salom botga hush kelibsiz ', msg.from.first_name)
})
//Rasm Jo'natish
bot.onText(/\/photo/, msg =>{
    bot.sendPhoto(msg.chat.id,'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg',{
        caption:'Izoh'
    })
})
if ((msg.text !== '/start')||(msg.text !== '/photo')){
    bot.sendMessage(msg.chat.id, msg.text)
}