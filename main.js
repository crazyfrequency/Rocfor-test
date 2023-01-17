const { VK } = require("vk-io");
const express = require("express");
const app = express();
const http = require('http');
const https = require('https');
const bp = require("body-parser");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const fileUpload = require('express-fileupload');
const {Pool} = require("pg");
const helmet = require('helmet');
const { vk_token, dc_token, site, database} = require('./config.json');
const vk = new VK({token: vk_token});
const {Client, GatewayIntentBits, Message, EmbedBuilder,ActionRowBuilder,ButtonBuilder, Partials} = require('discord.js');
const {get_messages_discord,get_messages_vk,get_guilds_discord,get_channels_discord,get_channels_vk} = require("./libs/getMessages");
const { mainTimer } = require("./libs/mainTimer");

/**@type {{vk_name:String,vk_image_url:String,default_channel_id:String,activity:import("discord.js").PresenceData}}*/
var bot_settings = JSON.parse(fs.readFileSync("./libs/config.json"))

const bot = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

var mt = new mainTimer(bot, vk);

//дополнительные модули
app.use(helmet());
app.use('/resource', express.static('./site/'));
app.use(cookieParser());
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

require("./routes/api_befor")(app);

require("./routes/api_facts")(app);

require("./routes/api_channels")(app, vk, bot);

require("./routes/api_send")(app, mt);

require("./routes/api_users")(app);

require("./routes/api_last")(app);

require("./libs/eventlistner")(vk, bot, bot_settings, mt);

bot.login(dc_token);

const privateKey  = fs.readFileSync('./itclub-cicd.key', 'utf8');
const certificate = fs.readFileSync('./itclub-cicd.crt', 'utf8');
const credentials = {key: privateKey, cert: certificate};


// app.listen(site.port,()=>{console.log(`Сервер запущен\nПорт:${site.port}`)});
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(site.port.http,()=>{console.log(`Сервер http запущен\nПорт:${site.port.http}`)});
httpsServer.listen(site.port.https,()=>{console.log(`Сервер https запущен\nПорт:${site.port.https}`)});