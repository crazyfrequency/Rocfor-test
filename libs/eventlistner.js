const { VK } = require("vk-io");
const {Client, Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const images_types = ["bmp", "emf", "emz", "eps", "fpix", "fpx", "gif","jpeg", "jpg", "pict", "pct", "png", "pntg", "psd", "qtif", "sgi", "tga", "tpic", "tiff", "tif", "wmf", "wmz"];
const {database} = require("../config.json");
const {Pool} = require("pg");
const {choose} = require("./methodsBD");
const { send_fact } = require("./facts");
const { mainTimer } = require("./mainTimer");
/**
 * 
 * @param {VK} client 
 * @param {Client} bot 
 * @param {{vk_name:String,vk_image_url:String,default_channel_id:String,activity:import("discord.js").PresenceData}} bot_settings 
 * @param {mainTimer} mt 
 */
module.exports = (client, bot, bot_settings, mt) => {
    client.updates.on('wall_post', async (context)=>{
        console.debug(context);
        let post = context.wall;
        let data = post, restext = "", embed = [], attach = [];
        while(post.copyHistory.length!=0){
            if(post.text)
                restext+=post.text.replace(/\[(https:\/\/|http:\/\/|)(vk.com\/|)([a-zA-Z0-9\-_]{1,})\|([^\]]{1,})\]/gm, "[$4](https://vk.com/$3)")+"\n-----------------\n";
                post = post.copyHistory[0];
        }
        restext+=post.text.replace(/\[(https:\/\/|http:\/\/|)(vk.com\/|)([a-zA-Z0-9\-_]{1,})\|([^\]]{1,})\]/gm, "[$4](https://vk.com/$3)");

        for(let i of post.attachments){
            if(i.type=="photo"){
                if(embed.length<10)
                    embed.push(new EmbedBuilder().setImage(i.mediumSizeUrl));
            }else if(i.type=="doc"){
                let ext = i.ext||i.extension;
                if(images_types.includes(ext.toLowerCase())&&embed.length<10){
                    embed.push(new EmbedBuilder().setImage(i.url))
                }else{
                    if(i.url)
                    attach.push({
                        attachment: i.url,
                        name: i.title
                    })
                    console.log(i)
                }
            }else if(i.type=="audio"){
                if(i.url) attach.push(i.url)
            }else if(i.type=="audio_message"){
                if(i.url) attach.push(i.url)
            }else if(i.type=="video"){
                if(i.player) restext+=`\n[${i.title||"video"}](${i.player})`
                else if(i.title){
                    restext+="\n-----------------\n"+
                    `В оригинале есть видео "${i.title}"`;
                    if(i.platformName)
                        restext+=` из "${i.platformName}"`;
                }
            }
        }
        if(embed.length==0) embed.push(new EmbedBuilder());
        embed[0].setDescription(restext).setAuthor({name:bot_settings.vk_name, iconURL:bot_settings.vk_image_url, url:`https://vk.com/club${(-data.ownerId).toString()}`});
        for(let i of embed)
            i.setColor(255);
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setURL(`https://vk.com/club${(-data.ownerId).toString()}`)
                    .setLabel("Группа").setStyle(ButtonStyle.Link)
            ).addComponents(
                new ButtonBuilder()
                    .setURL(`https://vk.com/wall${data.ownerId.toString()}_${data.id}`)
                    .setLabel("Оригинал").setStyle(ButtonStyle.Link)
            )
        let channel = await bot.channels.fetch(bot_settings.default_channel_id)
        if(!channel) return console.error("channel if null");
        channel.send({
            embeds:embed,
            files:attach,
            components:[row]
        }).catch(async(e)=>console.error(e));
    });

    bot.once("ready", async()=>{
        console.log(`${bot.user.username} online`);
        setTimeout(async()=>console.debug(`ping: ${Math.round(bot.ws.ping)}ms`),1000);
        bot.user.setPresence(bot_settings.activity);
        var now = new Date();
        var millis = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 5, 50, 2, 0)) - now;
        if(millis < 0){
            millis += 86400000;
        }
        setTimeout(async ()=>{
            send_fact(bot, bot_settings);
            setInterval(async()=>send_fact(bot, bot_settings),86400000);
        }, millis);
        const pool = new Pool(database);
        while(true){
            let res = await pool.connect().catch(()=>{
                console.error("нет подключения к бд");
                return "er"}
                );
            if(res!="er") break;
        }
        let res = await pool.query("SELECT * FROM facts WHERE tosend IS NOT NULL AND sended = false AND bad = false").catch(()=>null);
        if((!res?.rows?.length)||res?.rows?.length<5){
            let need_count = 5-(res?.rows?.length||0);
            let res1 = await pool.query("SELECT * FROM facts WHERE tosend IS NULL AND sended = false AND bad = false").catch(()=>null);
            if(!res1?.rows?.length){
                console.error("Ошибка фактов!");
                return pool.end();
            }
            if(res1.rows.length<need_count)
                need_count = res1.rows.length;
            let facts = [];
            while(facts.length<need_count){
                let fact = choose(res1.rows);
                if(!facts.includes(fact))
                    facts.push(fact);
            }
            let num = 0;
            if(res?.rows){
                for(let i of res.rows){
                    if(num<i.tosend) num = i.tosend;
                }
            }
            for(let i of facts){
                await pool.query("UPDATE facts SET tosend=$1 WHERE id=$2",[++num,i.id]).catch((e)=>console.error(e));
            }
        }
        console.log("Подключено к бд");
        await mt.start();
        pool.end();
    });

    client.updates.start();
    console.log("API vk подключен");
}

