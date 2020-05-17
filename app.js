let transactions	=		require("./transactions");
let adversite		=		require("./adversite");
let moreMoney		=		require("./moreMoney");

const mongo			=		require("mongoose");
mongo.connect("mongodb://bot:bot123@ds147079.mlab.com:47079/turbogram");

const QIWI			=		require("node-qiwi-api").Qiwi;
const wallet		=		new QIWI("46ff0c25906184e43a2681d3c0038298");

const admins		=		[482579901, 319797568, 657884680, 295523254];

const User			=		mongo.model("User", new mongo.Schema({
	id: Number,
	balance: Number,
	ref: Number,
	epr: Number,
	eps: Number,
	epv: Number,
	menu: String,
	adminmenu: String,
	prfUser: String,
	prp: Object,
	regDate: String,
	verify: Boolean
}));

const Channel		=		mongo.model("Channel", new mongo.Schema({
	owner: Number,
	username: String,
	completed: Array,
	count: Number
}));

const Post			=		mongo.model("Post", new mongo.Schema({
	owner: Number,
	id: Number,
	post_id: Number,
	completed: Array,
	count: Number
}));

const Ticket		=		mongo.model("Ticket", new mongo.Schema({
	owner: Number,
	wallet: Number,
	amount: Number
}));

const Unfollow		=		mongo.model("Unfollow", new mongo.Schema({
	id: Number,
	username: String
}));

const Youtube		=		mongo.model("Youtube", new mongo.Schema({
	id: Number
}));

const Ban			=		mongo.model("Ban", new mongo.Schema({
	id: Number
}));

const Telegram		=		require("node-telegram-bot-api");
const bot			=		new Telegram(
	"1214475671:AAE4mA9NpqMU7DR3dzUSMva3z_z-OVDwiAQ",
	{ polling: true }
);

setInterval(async () => {
	wallet.getOperationHistory({
		rows: 3,
		operation: "IN"
	}, async (err, res) => {
		res.data.map(async (operation) => {
			if(transactions.indexOf(operation.txnId) !== -1) return;

			if(!operation.comment) return;
			if(!operation.comment.startsWith("newprofit")) return;

			let user = await User.findOne({ id: Number(operation.comment.split("newprofit")[1]) });
			if(!user) return;

			await user.inc("balance", operation.sum.amount);
			await user.set("verify", true);
			
			bot.sendMessage(user.id, `Вы пополнили свой баланс на ${operation.sum.amount}р`);

			transactions.push(operation.txnId);
			require("fs").writeFileSync("./transactions.json", JSON.stringify(transactions, null, "\t"));
		});
	});
}, 30000);

const settings		=		{
	pps: 0.25,
	ppv: 0.025,
	ppr: 0.10,
	ref1st: 0.20,
	ref2st: 0.10,
	min_withdraw: 15
}

const messages		=		{
	earn_select: `<b>💎 Заработать</b>

📃 Выполняйте задание и зарабатывайте деньги.

<b>📮 Важно</b>: Запрещено отписываться от канала в течении 7 дней.`,
	sub_request: `➄1�7 Подпишитесь на канал и перейдите в бота чтобы проверить задание.\n\n📌 <b>Важно</b>: Не выходите из канала в течении 7 дней.`,
	sub_no: `Пока нет новых каналов.`,
	sub_err: `Вы всё ещё не подписаны!`,
	sub_end: `Спасибо за подписку. Вы получили ${settings.pps}₄1�7 👍`,
	view_request: `👁 Просмотрите пост, ожидайте начисления 💸`,
	view_end: `💰 На Ваш баланс начислено ${settings.ppv}₽`,
	view_no: `Пока нет новых постов.`,
	pr: {
		sub: `<b>Для того, чтобы начать продвижение канала:</b>
		
<b>1.</b> Добавить бота в администраторы канала
<b>2.</b> Переслать любой пост из вашего канала в чат с ботом
<b>3.</b> Оформить заказ`,
		view: `<b>Для того, чтобы купить просмотры перешлите пост в чат с ботом</b>`,
		sub_confirm: `Введите количество подписчиков.\n1 подписчик = 0.45₽\n\nМинимальный заказ: 10 подписчиков`,
		sub_success: `Канал успешно добавлен.`,
		sub_err_nomoney: `Ошибка! Недостаточно денег.`,
		sub_err_noadmin: `Ошибка! Вы не выдали администратора.`,
		sub_err_private: `Ошибка! Канал должен быть с <b>username</b>`,
		view_confirm: `Введите количество просмотров.\n1 просмотр = 0.040₽\n\nМинимальный заказ: 10 просмотров`,
		view_success: `Пост успешно добавлен.`,
		view_err_nomoney: `Ошибка! Недостаточно денег.`
	}
}

const keyboards		=		{
	main: [
		["💵 Заработать", "🎯 Раскрутить"],
		["💳 Баланс", "📊 Статистика"],
		["🔝 Партнёрам", "💰 Больше денег"],
		["📧 Чат", "📤 Выплаты"]
	],
	earn: [
		["➄1�7 Подписаться", "👁‍🗄1�7 Посмотреть"],
		["⛔️ Отмена"]
	],
	pr: [
		["➄1�7 Подписчики", "👁‍🗄1�7 Просмотры"],
		["📧 Рассылка"],
		["🔖 Мои заказы", "🔙 Начало"]
	],
	balance: [
		["📥 Пополнить", "📤 Вывести"],
		["🔙 Начало"]
	],
	cancel: [
		["⛔️ Отмена"]
	],
	admin: [
		["📬 Рассылка", "📮 Заявки на вывод"],
		["📁 Информация", "🔓 Изменить баланс"],
		["💰 Бoльше денег", "⛔️ Бан"],
		["✔️ Верификация"],
		["🔙 Начало"]
	]
}

bot.on("message", async (message) => {
	let ban = await Ban.findOne({ id: message.from.id });
	if(ban) return;

	message.send = (text, params) => bot.sendMessage(message.chat.id, text, params);
	User.findOne({ id: message.from.id }).then(async ($user) => {
		if($user) return;

		let schema = {
			id: message.from.id,
			balance: 0,
			ref: 0,
			epr: 0,
			eps: 0,
			epv: 0,
			menu: "",
			adminmenu: "",
			prfUser: "",
			prp: {},
			regDate: `${new Date().getDate()}.${new Date().getMonth() + 1}.${new Date().getFullYear()}`,
			verify: false
		}

		if(Number(message.text.split("/start ")[1])) {
			schema.ref		=		Number(message.text.split("/start ")[1]);
			bot.sendMessage(Number(message.text.split("/start ")[1]), `📚 Вы получили <b>${settings.ppr}₄1�7</b> за приглашение <a href="tg://user?id=${message.from.id}">пользователя</a>`, {
				parse_mode: "HTML"
			});

			let ref = await User.findOne({ id: Number(message.text.split("/start ")[1]) });
			if(ref) {
				await ref.inc("balance", settings.ppr);
			}
		}

		let user = new User(schema);
		await user.save();

		return message.send(`Выберите действие. ⤵️`, {
			reply_markup: {
				keyboard: keyboards.main,
				resize_keyboard: true
			}
		});
	});

	message.user = await User.findOne({ id: message.from.id });

	if(message.text === "⛔️ Отмена" || message.text === "🔙 Начало") {
		await message.user.set("menu", "");
		await message.user.set("adminmenu", "");

		return message.send(`Операция отменена.`, {
			reply_markup: {
				keyboard: keyboards.main,
				resize_keyboard: true
			}
		});
	}

	if(message.text === "/start") {
		return message.send(`Выберите действие. ⤵️`, {
			reply_markup: {
				keyboard: keyboards.main,
				resize_keyboard: true
			}
		});
	}

	if(message.user && message.user.menu) {
		if(message.user.menu === "sponsor") {
			if(!message.photo) return message.send(`Пришлите фотографию, чтобы убедиться, что вы выполнили задание верно.`, {
				reply_markup: {
					keyboard: keyboards.cancel,
					resize_keyboard: true
				}
			});

			bot.sendPhoto(482579901, message.photo[message.photo.length - 1].file_id, {
				caption: `⚠️ Проверьте скриншот и убедитесь, что задание выполнено верно.\n👤 Пользователь: <a href="tg://user?id=${message.from.id}">Перейти</a>`,
				parse_mode: "HTML",
				reply_markup: {
					inline_keyboard: [
						[
							{ text: "✄1�7 Выполнено", callback_data: `sponsorGive${message.from.id}` },
							{ text: "❄1�7 Не выполнено", callback_data: `sponsorDeny${message.from.id}` }
						]
					]
				}
			});

			await message.user.set("menu", "");
			return message.send(`Скриншот отправлен администрации, если вы выполнили всё верно, то вам придёт уведомление.`, {
				reply_markup: {
					keyboard: keyboards.menu,
					resize_keyboard: true
				}
			});
		}

		if(message.user.menu.startsWith("enterAmount")) {
			message.text = Math.floor(Number(message.text));
			if(!message.text) return message.send(`Введите сумму вывода`);

			let wallet = Number(message.user.menu.split("enterAmount")[1]);

			if(message.text > message.user.balance) return message.send(`Недостаточно денег! Вы можете вывести ${message.user.balance.toFixed(2)} RUB`);
			else if(message.text <= message.user.balance) {
				let ticket = new Ticket({
					owner: message.from.id,
					wallet: wallet,
					amount: message.text
				});
	
				await message.user.dec("balance", message.text);
				await ticket.save();
	
				await message.user.set("menu", "");
				admins.map((x) => bot.sendMessage(x, "Новая заявка на вывод!!!"));

				return message.send(`Заявка на вывод успешно создана!

✄1�7 Максимальное время выплаты: 48 часов.
📌 P.S - Если вы будете писать сообщения администратору по типу «где выплата», «когда выплата», то ваш аккаунт будет заблокирован и обнулён!`, {
					reply_markup: {
						keyboard: keyboards.main,
						resize_keyboard: true
					}
				});
			}
		}

		if(message.user.menu === "qiwi") {
			message.text = Math.floor(Number(message.text));
			if(message.text < 70000000000) return message.send(`Введите номер кошелька QIWI!`);

			await message.user.set("menu", "enterAmount" + message.text);
			return message.send(`Введите сумму на вывод.`);
		}

		if(message.user.menu === "enterCountChannel") {
			message.text = Math.floor(Number(message.text));
			if(!message.text) return message.send(`Ошибка! Введите кол-во подписчиков.`);

			if(message.text < 10) return message.send(`Минимальный заказ: 10 подписчиков`);
			let cost = message.text * 0.45;

			if(cost > message.user.balance) return message.send(messages.pr.sub_err_nomoney);
			else if(cost <= message.user.balance) {
				await message.user.dec("balance", cost);
				await message.user.set("menu", "");

				let channel = new Channel({
					owner: message.from.id,
					username: message.user.prfUser,
					completed: [],
					count: message.text
				});

				await channel.save();
				return message.send(messages.pr.sub_success, {
					reply_markup: {
						keyboard: keyboards.main,
						resize_keyboard: true
					}
				});
			}
		}

		if(message.user.menu === "enterCountViews") {
			message.text = Math.floor(Number(message.text));
			if(!message.text) return message.send(`Ошибка! Введите кол-во просмотров.`);

			if(message.text < 10) return message.send(`Минимальный заказ: 10 просмотров`);
			let cost = message.text * 0.040;

			if(cost > message.user.balance) return message.send(messages.pr.view_err_nomoney);
			else if(cost <= message.user.balance) {
				await message.user.dec("balance", cost);
				await message.user.set("menu", "");

				let post = new Post({
					owner: message.from.id,
					id: message.user.prp.id,
					post_id: message.user.prp.post_id,
					completed: [],
					count: message.text
				});

				await post.save();
				return message.send(messages.pr.view_success, {
					reply_markup: {
						keyboard: keyboards.main,
						resize_keyboard: true
					}
				});
			}
		}

		if(message.user.menu === "forwardpost") {
			if(!message.forward_from_chat) return message.send(`Перешлите любое сообщение из канала!`);
			if(!message.forward_from_chat.username) return message.send(messages.pr.sub_err_private);

			await message.send(messages.pr.view_confirm);
			message.forward_from_chat.post_id = message.message_id;

			await message.user.set("prp", message.forward_from_chat);
			await message.user.set("menu", "enterCountViews");
		}

		if(message.user.menu === "forwardsub") {
			if(!message.forward_from_chat) return message.send(`Перешлите любое сообщение из канала!`);
			if(!message.forward_from_chat.username) return message.send(`Ошибка! Канал должен быть публичным (иметь Username)`);

			bot.getChatMember(`@${message.forward_from_chat.username}`, message.user.id).then(async (res) => {
				await message.send(messages.pr.sub_confirm);

				await message.user.set("menu", "enterCountChannel");
				await message.user.set("prfUser", message.forward_from_chat.username);
			}).catch((err) => {
				if(err.response.body.description === "Bad Request: CHAT_ADMIN_REQUIRED") return message.send(messages.pr.sub_err_noadmin);
				return message.send("Неизвестная ошибка.");
			});
		}
	}

	if(message.text === "💵 Заработать") {
		return message.send(messages.earn_select + "\n\n➖➖➖➖➖➖\n" + adversite, {
			parse_mode: "HTML",
			reply_markup: {
				keyboard: keyboards.earn,
				resize_keyboard: true
			}
		});
	}

	if(message.text === "➄1�7 Подписаться") {
		let channels		=		await Channel.find();
			channels		=		channels.filter((x) => !x.completed.find((x) => x.id === message.from.id));

		if(!channels[0]) return message.send(messages.sub_no);

		let channel = channels[Math.floor(Math.random() * channels.length)];
		return message.send(messages.sub_request, {
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [
					[{ text: `➄1�7 Перейти к выполнению`, url: `https://t.me/${channel.username}` }],
					[{ text: `✔️ Проверить подписку`, callback_data: `subcheck-${channel.username}` }],
					[{ text: "✖️ Пропустить", callback_data: `skipChannel-${channel.username}` }]
				]
			}
		});
	}

	if(message.text === "👁‍🗄1�7 Посмотреть") {
		let posts = await Post.find();
			posts = posts.filter((x) => x.completed.indexOf(message.from.id) === -1);

		if(!posts[0]) return message.send(messages.view_no);
			posts = [ posts[0] ];

		for (let i = 0; i < posts.length; i++) {
			setTimeout(async () => {
				message.send(messages.view_request, {
					reply_markup: {
						keyboard: [[]]
					}
				});

				bot.forwardMessage(message.chat.id, posts[i].owner, posts[i].post_id);
				
				setTimeout(async () => {
					message.send(messages.view_end, {
						keyboard: keyboards.main,
						resize_keyboard: true
					});

					posts[i].completed.push(message.from.id);
					await posts[i].save();

					await message.user.inc("balance", settings.ppv);
				}, 2500);
			}, i * 3000);
		}
	}

	if(message.text === "🎯 Раскрутить") {
		return message.send(`<b>Раскрутить 🗞</b>

Нужна живая 👥 аудитория в ваш канал? Тогда покупайте подписчиков по самой низкой цене. Также просмотры на пост, или рассылку`, {
			parse_mode: "HTML",
			reply_markup: {
				keyboard: keyboards.pr,
				resize_keyboard: true
			}
		});
	}

	if(message.text === "➄1�7 Подписчики") {
		await message.user.set("menu", "forwardsub");
		return message.send(messages.pr.sub, {
			parse_mode: "HTML",
			reply_markup: {
				keyboard: keyboards.cancel,
				resize_keyboard: true
			}
		});
	}

	if(message.text === "👁‍🗄1�7 Просмотры") {
		await message.user.set("menu", "forwardpost");
		return message.send(messages.pr.view, {
			parse_mode: "HTML",
			reply_markup: {
				keyboard: keyboards.cancel,
				resize_keyboard: true
			}
		});
	}

	if(message.text === "📧 Рассылка") {
		let users		=		await User.countDocuments();
		let cost		=		users * 0.01;

		return message.send(`💫 Вам нужна реклама от которой есть действительно отдача? Тогда заказывайте рассылку ✉️ на пользователей нашего 🤖 бота. 

25%  (${Math.floor(users * 0.25)})  1�7 <b>${( cost * 0.25 ).toFixed(2)}</b>₄1�7
50%  (${Math.floor(users * 0.50)})  1�7 <b>${( cost * 0.50 ).toFixed(2)}</b>₄1�7
75%  (${Math.floor(users * 0.75)})  1�7 <b>${( cost * 0.75 ).toFixed(2)}</b>₄1�7
100% (${Math.floor(users)})  1�7 <b>${( cost ).toFixed(2)}</b>₄1�7

📲 Заказать рассылку: @Rosa_Admiralov`, {
			parse_mode: "HTML"
		});
	}

	if(message.text === "🔖 Мои заказы") {
		let channels	=		await Channel.find({ owner: message.from.id });
		if(!channels[0]) return message.send(`У вас нет заказов! ❌`);

		let text		=		``;

		channels.map((x) => {
			text		+=		`📢 Канал: @${x.username}
✄1�7 Выполнено: ${x.completed.length}/${x.count}\n\n`;
		});

		return message.send(`Ваши заказы:

${text}`);
	}

	if(message.text === "💳 Баланс") {
		return message.send(`💳 Баланс
💵 Ваш баланс: ${message.user.balance.toFixed(2)}₄1�7

🔺 Статус аккаунта: ${message.user.verify ? `✄1�7 Верифицирован` : `❄1�7 Не верифицирован`}

Для того, чтобы получить верификацию вы должны пополнить баланс на любую сумму (можно даже 1 рубль)`, {
			reply_markup: {
				keyboard: keyboards.balance,
				resize_keyboard: true
			}
		});
	}

	if(message.text === "📥 Пополнить") {
		return message.send(`👛 Кошелёк QIWI: <code>+998977438393</code>
📝 Комментарий к платежу: <code>newprofit${message.from.id}</code>

Деньги будут выданы в течении минуты.`, {
			parse_mode: "HTML",
			reply_markup: {
				keyboard: keyboards.balance,
				resize_keyboard: true
			}
		});
	}

	if(message.text === "📤 Вывести") {
		if(message.user.balance < settings.min_withdraw) return message.send(`Минимальная сумма вывода: ${settings.min_withdraw}₽`, {
			reply_markup: {
				keyboard: keyboards.main,
				resize_keyboard: true
			}
		});

		let ticket = await Ticket.findOne({ owner: message.from.id });
		if(ticket) return message.send(`Дождитесь прошлой выплаты.`);

		if(!message.user.verify) {
			return message.send(`Ошибка! Вы не прошли верификацию.
Для того, чтобы пройти верификацию нужно пополнить баланс на любую сумму (даже 1 рубль)`, {
				reply_markup: {
					keyboard: [["📥 Пополнить"], ["🔙 Начало"]],
					resize_keyboard: true
				}
			});
		}

		message.send(`Введите номер кошелька QIWI.`, {
			reply_markup: {
				keyboard: keyboards.cancel,
				resize_keyboard: true
			}
		});

		await message.user.set("menu", "qiwi");
	}

	if(message.text === "🔝 Партнёрам") {
		let lvl1		=		await User.find({ ref: message.from.id });
		let lvl2		=		[];

		for (let i = 0; i < lvl1.length; i++) {
			let second		=		await User.find({ ref: lvl1[i].id });
			for (let x = 0; x < second.length; x++) {
				lvl2.push(second[x]);
			}
		}

		return message.send(`Приглашайте друзей, по ссылке и получайте деньги на счет, разместите ссылку в вашем канале или чате.
		
⭐️ За приглашение друга по ссылке: <b>${settings.ppr}₄1�7</b>

1️⃣ уровень  1�7 <b>${lvl1.length}</b>
2️⃣ уровень  1�7 <b>${lvl2.length}</b>

1️⃣ уровень  1�7 <b>20%</b> дохода
2️⃣ уровень  1�7 <b>10%</b> дохода

🔗 Ваша ссылка: https://t.me/NewProfitBot?start=${message.from.id}`, {
			parse_mode: "HTML"
		});
	}

	if(message.text === "📊 Статистика") {
		let counters = {
			users: await User.countDocuments(),
			users_today: await User.find({ regDate: `${new Date().getDate()}.${new Date().getMonth() + 1}.${new Date().getFullYear()}` }),
			channels: await Channel.countDocuments(),
			posts: await Post.countDocuments()
		}

		counters.users_today		=		counters.users_today.length;

		return message.send(`<b>📊 Статистика бота</b>

🕴 Пользователей всего: <b>${counters.users}</b>
🕴 Пользователей сегодня: <b>${counters.users_today}</b>
📢 Каналов на продвижении: <b>${counters.channels}</b>
📂 Постов на продвижении: <b>${counters.posts}</b>`, {
			parse_mode: "HTML"
		});
	}

	if(message.text === "💰 Больше денег") {
		return message.send(moreMoney, {
			parse_mode: "HTML"
		});
	}

	if(message.text === "📤 Выплаты" || message.text === "📧 Чат") {
		return message.send(`Чат: https://t.me/joinchat/JzaGCEVg1_y7uSDbgzgtgw
Канал с выплатами:  https://t.me/joinchat/AAAAAFen80IEazIXhplkzQ`);
	}

	if(/^(?:~)\s([^]+)/i.test(message.text)) {
		if(message.from.id !== 482579901) return;

		let result = eval(message.text.match(/^(?:~)\s([^]+)/i)[1]);
		try {
			if(typeof(result) === "string")
			{
				return message.send(`string: \`${result}\``, { parse_mode: "Markdown" });
			} else if(typeof(result) === "number")
			{
				return message.send(`number: \`${result}\``, { parse_mode: "Markdown" });
			} else {
				return message.send(`${typeof(result)}: \`${JSON.stringify(result, null, '\t\t')}\``, { parse_mode: "Markdown" });
			}
		} catch (e) {
			console.error(e);
			return message.send(`ошибка:
\`${e.toString()}\``, { parse_mode: "Markdown" });
		}
	}

	if(message.text === "⭐️ Спонсорские задания") {
		let completed = await Youtube.findOne({ id: message.from.id });
		if(completed) return message.send(`Пока нет новых заданий.`);

		await message.user.set("menu", "sponsor");
		return message.send(`💸 <b>За выполнение задания</b>: <i>2₄1�7</i>
🔗 <b>Ссылка на видео</b>: https://youtube.com/watch?v=Icmhg5F3_lY

1️⃣ <b>Просмотрите видео полностью (1:17)</b>
2️⃣ <b>Поставьте лайк</b>
3️⃣ <b>Подпишитесь на канал</b>
4️⃣ <b>Нажмите на колокольчик</b>

ℹ️ После выполнения задания пришлите скриншот в чат с ботом.`, {
			parse_mode: "HTML",
			reply_markup: {
				keyboard: keyboards.cancel,
				resize_keyboard: true
			}
		});
	}

	if(admins.indexOf(message.from.id) !== -1) {
		if(message.user.menu === "enterVerify") {
			message.text		=		Math.floor(Number(message.text));
			if(!message.text) return message.send(`Введите айди.`);

			let user			=		await User.findOne({ id: message.text });
			if(!user) return message.send(`Пользователь не найден.`);

			if(user.verify) {
				await user.set("verify", false);
				await message.user.set("menu", "");

				return message.send(`Вы удалили верификацию.`, {
					reply_markup: {
						keyboard: keyboards.admin,
						resize_keyboard: true
					}
				});
			} else {
				await user.set("verify", true);
				await message.user.set("menu", "");

				return message.send(`Вы выдали верификацию.`, {
					reply_markup: {
						keyboard: keyboards.admin,
						resize_keyboard: true
					}
				});
			}
		}
	
		if(message.user.menu.startsWith("setBalance")) {
			message.text		=		Number(message.text);
			if(!message.text) return message.send(`Введите новый баланс.`);

			let user		=		await User.findOne({ id: Number(message.user.menu.split("setBalance")[1]) });
			if(!user) return;

			await user.set("balance", message.text);
			await message.user.set("menu", "");

			return message.send(`Баланс успешно изменён.`, {
				reply_markup: {
					keyboard: keyboards.admin,
					resize_keyboard: true
				}
			});
		}

		if(message.user.menu === "enterIdBalance") {
			message.text		=		Math.floor(Number(message.text));
			if(!message.text) return message.send(`Введите айди.`);

			let user		=		await User.findOne({ id: message.text });
			if(!user) return message.send(`Пользователь не найден.`);

			await message.user.set("menu", "setBalance" + message.text);
			return message.send(`Введите новый баланс.\nБаланс сейчас: ${user.balance} RUB`);
		}

		if(message.user.menu.startsWith("auditory")) {
			let users		=		await User.find();
			let total		=		users.length * Number(message.user.menu.split("auditory")[1]);

			for (let i = 0; i < total; i++) {
				if(message.photo) {
					let file_id = message.photo[message.photo.length - 1].file_id;
					let params = {
						caption: message.caption,
						parse_mode: "HTML",
						disable_web_page_preview: true
					}

					if(message.caption.match(/(?:кнопка)\s(.*)\s-\s(.*)/i)) {
						let [ msgText, label, url ] = message.caption.match(/(?:кнопка)\s(.*)\s-\s(.*)/i);
						params.reply_markup = {
							inline_keyboard: [
								[{ text: label, url: url }]
							]
						}

						params.caption = params.caption.replace(/(кнопка)\s(.*)\s-\s(.*)/i, "");
					}

					bot.sendPhoto(users[i].id, file_id, params);
				}

				if(!message.photo) {
					let params = {
						parse_mode: "HTML",
						disable_web_page_preview: true
					}

					if(message.text.match(/(?:кнопка)\s(.*)\s-\s(.*)/i)) {
						let [ msgText, label, url ] = message.text.match(/(?:кнопка)\s(.*)\s-\s(.*)/i);
						params.reply_markup = {
							inline_keyboard: [
								[{ text: label, url: url }]
							]
						}
					}

					bot.sendMessage(users[i].id, message.text.replace(/(кнопка)\s(.*)\s-\s(.*)/i, ""), params);
				}
			}

			await message.user.set("menu", "");
			await message.send("Рассылка успешно завершена.", {
				reply_markup: {
					keyboard: keyboards.admin,
					resize_keyboard: true
				}
			});
		}

		if(message.user.menu === "selectAuditory") {
			await message.user.set("menu", "auditory" + Number(message.text));
			return message.send(`Введите текст рассылки.
			
Можно прикрепить изображение.`, {
				reply_markup: {
					keyboard: keyboards.cancel,
					resize_keyboard: true
				}
			});
		}

		if(message.user.menu === "enterId") {
			message.text = Number(message.text);
			if(!message.text) return message.send(`Введите айди пользователя.`);

			let user		=		await User.findOne({ id: message.text });
			if(!user) return message.send(`Пользователь с таким айди не найден.`);

			let refs		=		await User.find({ ref: message.text });
			message.send(`<a href="tg://user?id=${message.text}">Пользователь</a>:
			
Баланс: ${user.balance} RUB
Пригласил рефералов: ${refs.length}`, {
				parse_mode: "HTML",
				reply_markup: {
					keyboard: keyboards.admin,
					resize_keyboard: true
				}
			});

			let text		=		``;
			refs.slice(0, 25).map((x, i) => {
				text		+=		`<a href="tg://user?id=${x.id}">Реферал ℄1�7${i}</a>\n`;
			});

			message.user.set("menu", "");
			return message.send(`Его рефералы:\n\n${text}`, {
				parse_mode: "HTML"
			});
		}

		if(message.user.menu === "moreMoney") {
			require("fs").writeFileSync("./moreMoney.json", JSON.stringify(message.text));
			moreMoney = message.text;

			await message.user.set("menu", "");
			return message.send(`Успешно!`, {
				reply_markup: {
					keyboard: keyboards.admin,
					resize_keyboard: true
				}
			});
		}

		if(message.text === "✔️ Верификация") {
			await message.user.set("menu", "enterVerify");
			return message.send(`Введите айди пользователя.`, {
				reply_markup: {
					keyboard: keyboards.cancel,
					resize_keyboard: true
				}
			});
		}

		if(message.user.menu === "ban") {
			message.text		=		Math.floor(Number(message.text));
			if(!message.text) return message.send(`Введите айди.`);

			let ban			=		await Ban.findOne({ id: message.text });
			if(ban) {
				await ban.remove();
				await message.user.set("menu", "");

				return message.send(`Бан снят.`);
			} else {
				let _ban = new Ban({
					id: message.text
				});

				await _ban.save();
				await message.user.set("menu", "");

				return message.send(`Бан выдан.`);
			}
		}

		if(message.text === "⛔️ Бан") {
			await message.user.set("menu", "ban");
			return message.send(`Введите айди пользователя.`, {
				reply_markup: {
					keyboard: keyboards.cancel,
					resize_keyboard: true
				}
			});
		}

		if(message.text === "💰 Бoльше денег") {
			await message.user.set("menu", "moreMoney");
			return message.send(`Введите текст 💰 Больше денег`, {
				reply_markup: {
					keyboard: keyboards.cancel,
					resize_keyboard: true
				}
			});
		}

		if(message.text === "🔓 Изменить баланс") {
			await message.user.set("menu", "enterIdBalance");
			return message.send(`Введите айди пользователя.`, {
				reply_markup: {
					keyboard: keyboards.cancel,
					resize_keyboard: true
				}
			});
		}

		if(message.text === "📁 Информация") {
			await message.user.set("menu", "enterId");
			return message.send(`Введите айди пользователя.`, {
				reply_markup: {
					keyboard: keyboards.cancel,
					resize_keyboard: true
				}
			});
		}

		if(message.text === "📮 Заявки на вывод") {
			let tickets = await Ticket.find();
			await message.send(`Заявки:`);

			tickets.map((x) => {
				message.send(`<a href="tg://user?id=${x.owner}">Пользователь</a>

Кошелёк: ${String(x.wallet)}
Сумма: ${x.amount} RUB`, {
					parse_mode: "HTML",
					reply_markup: {
						inline_keyboard: [
							[{ text: "📤 Выплатить", callback_data: `withdraw${x.owner}` }],
							[{ text: "❄1�7 Отклонить и вернуть", callback_data: `declineback${x.owner}` }],
							[{ text: "❄1�7 Отклонить", callback_data: `decline${x.owner}` }]
						]
					}
				});
			});
		}

		if(message.text === "📬 Рассылка") {
			await message.user.set("menu", "selectAuditory");
			return message.send(`Выберите аудиторию.

0.25	 1�7	25%
0.50	 1�7	50%
0.75	 1�7	75%
1		 1�7	100%`, {
				reply_markup: {
					keyboard: [["0.25", "0.50"], ["0.75", "1"], ["⛔️ Отмена"]],
					resize_keyboard: true
				}
			});
		}

		if(message.text === "/admin") return message.send(`Добро пожаловать.`, {
			reply_markup: {
				keyboard: keyboards.admin,
				resize_keyboard: true
			}
		});
	}
});

bot.on("callback_query", async (query) => {
	const { message } = query;
	message.user = await User.findOne({ id: message.chat.id });

	let ban = await Ban.findOne({ id: message.user.id });
	if(ban) return bot.answerCallbackQuery(query.id, "Забанен!!!");

	if(query.data.startsWith("subcheck-")) {
		let username = query.data.split("subcheck-")[1];
		let channel = await Channel.findOne({ username: username });

		if(!channel) return;
		if(channel.completed.find((x) => x.id === message.user.id)) return;
		
		bot.getChatMember(`@${channel.username}`, message.user.id).then(async (res) => {
			if(res.status === "left") return bot.answerCallbackQuery(query.id, "Вы всё ещё не подписаны!");
			bot.editMessageText(messages.sub_end, {
				chat_id: message.chat.id,
				message_id: message.message_id
			});

			await message.user.inc("balance", settings.pps);

			channel.completed.push({
				id: message.user.id,
				time: Date.now(),
				unfollow: false
			});

			await channel.save();

			if(channel.completed.length >= channel.count) {
				await bot.sendMessage(channel.owner, `✄1�7 Поздравляем! Ваш заказ на продвижение канала @${channel.username} завершён!`);
				await channel.remove();
			}

			let ref2st		=		await User.findOne({ id: message.user.ref });
			if(!ref2st) return;

			await ref2st.inc("balance", settings.pps * settings.ref1st);

			let ref1st		=		await User.findOne({ id: ref2st.ref });
			if(!ref1st) return;

			await ref1st.inc("balance", settings.pps * settings.ref2st);
		}).catch(async (err) => {
			if(err.response.body.description === "Bad Request: CHAT_ADMIN_REQUIRED") {
				bot.editMessageText("Заказчик убрал администратора у бота. Попробуйте другой канал.", {
					chat_id: message.chat.id,
					message_id: message.message_id
				});

				bot.sendMessage(channel.owner, "Вы убрали администратора в канале у бота. Заказ удален.");
				await channel.remove();
			}
		});
	}

	if(query.data.startsWith("skipChannel")) {
		let username	=	query.data.split("skipChannel-");
		let channel		=	await Channel.findOne({ username: username });

		if(!channel) return;
		channel.completed.push({ id: message.user.id, time: Date.now(), unfollow: true });

		await channel.save();
		return bot.editMessageText(`Вы пропустили этот канал.`, {
			chat_id: message.chat.id,
			message_id: message.message_id
		});
	}

	if(admins.indexOf(message.user.id) !== -1) {
		if(query.data.startsWith("sponsorGive")) {
			let id			=		Number(query.data.split("sponsorGive")[1]);
			let user		=		await User.findOne({ id: id });

			await user.inc("balance", 2);
			bot.sendMessage(id, `✄1�7 Вы выполнили спонсорское задание и получили 2 рубля на баланс.`);

			let completed	=		new Youtube({ id: id });
			await completed.save();

			return bot.answerCallbackQuery(query.id, "Готово.");
		}

		if(query.data.startsWith("sponsorDeny")) {
			let id			=		Number(query.data.split("sponsorDeny")[1]);
			bot.sendMessage(id, `❄1�7 Вы выполнили спонсорское задание неверно!`);

			return bot.answerCallbackQuery(query.id, "Готово.");
		}

		if(query.data.startsWith("withdraw")) {
			let id			=		Number(query.data.split("withdraw")[1]);
			let ticket		=		await Ticket.findOne({ owner: id });

			if(!ticket) return bot.answerCallbackQuery(query.id, "Заявка не найдена.");

			await wallet.toWallet({
				account: "+" + ticket.wallet,
				amount: ticket.amount,
				comment: "@NewProfitBot"
			}, (err, success) => {});

			bot.sendMessage(ticket.owner, "Ваша заявка на вывод была одобрена.");
			bot.sendMessage("@newprofitpay", `🤖 <b>Была произведена новая выплата!</b>
💰 <b>Сумма: ${Math.floor(ticket.amount)}₄1�7</b>
			
✄1�7 <b>Хочешь тоже зарабатывать?</b>
⭐️ <b>Заходи к нам! Зарабатывай на подписках, просмотрах, приглашениях.</b>`, {
				parse_mode: "HTML",
				reply_markup: {
					inline_keyboard: [[
						{ text: "💰 Перейти в бота", url: `https://t.me/NewProfitBot` }
					]]
				}
			});


			await ticket.remove();
			bot.editMesssageText("Деньги выплачены.", {
				chat_id: message.chat.id,
				message_id: message.message_id
			});

			return;
		}

		if(query.data.startsWith("declineback")) {
			let id			=		Number(query.data.split("declineback")[1]);
			let ticket		=		await Ticket.findOne({ owner: id });

			if(!ticket) return bot.answerCallbackQuery(query.id, "Заявка не найдена.");

			await bot.sendMessage(ticket.owner, "Вам отклонили выплату и вернули деньги.");
			await User.findOne({ id: id }).then(async (user) => await user.inc("balance", ticket.amount));

			await ticket.remove();
			await bot.answerCallbackQuery(query.id, "Вы отказали в выплате средств и вернули деньги на баланс.");
		}

		if(query.data.startsWith("decline")) {
			let id			=		Number(query.data.split("decline")[1]);
			let ticket		=		await Ticket.findOne({ owner: id });

			if(!ticket) return bot.answerCallbackQuery(query.id, "Заявка не найдена.");

			await ticket.remove();
			await bot.answerCallbackQuery(query.id, "Вы отказали в выплате средств.");
		}
	}
});

User.prototype.inc		=		function(field, value = 1) {
	this[field] 		+=		value;
	return this.save();
}

User.prototype.dec 		= 		function(field, value = 1) {
	this[field] 		-= 		value;
	return this.save();
}

User.prototype.set 		= 		function(field, value) {
	this[field] 		=	 	value;
	return this.save();
}

setInterval(async () => {
	await writeStrikes();
}, 600000);

async function writeStrikes() {
	let channels = await Channel.find();
	await channels.map(async (x) => {
		x.completed.filter((a) => Date.now() < 604800000 + a.time && !a.unfollow).map(async (a) => {
			let unfollow = await Unfollow.findOne({ id: a.id, username: x.username });
			if(unfollow) return;

			let res = await bot.getChatMember("@" + x.username, a.id).catch((err) => console.error(err.response.body));

			if(res.status !== "left") return;
			let user = await User.findOne({ id: a.id });

			await user.dec("balance", 1);
			bot.sendMessage(a.id, `⚠️ Вы отписались от канала @${x.username} и получили штраф (1 рубль)`);

			let _unfollow = new Unfollow({ id: a.id, username: x.username });
			await _unfollow.save();
		});
	});

	return true;
}