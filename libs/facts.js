const { Client, EmbedBuilder } = require("discord.js");
const {database} = require("../config.json");
const {Pool} = require("pg");
const { choose } = require("./methodsBD");
/**
 * 
 * @param {Client} bot 
 * @param {{vk_name:String,vk_image_url:String,default_channel_id:String,activity:import("discord.js").PresenceData}} bot_settings 
 */
async function send_fact(bot, bot_settings){
    const pool = new Pool(database);
    let res = await pool.query("SELECT * FROM facts WHERE tosend IS NOT NULL AND sended = false AND bad = false ORDER BY tosend").catch((e)=>console.log(e));
    if(!res?.rows?.length){
        await pool.end();
        return send_fact(bot, bot_settings);
    }
    let channel = await bot.channels.fetch(bot_settings.default_channel_id).catch(()=>null);
    let embed = new EmbedBuilder().setColor("Purple").setTitle("Случайный факт:")
    .setDescription(res.rows[0].text);
    channel?.send({embeds:[embed]}).catch((e)=>console.error(e));
    await pool.query("UPDATE facts SET sended=true WHERE id=$1",[res.rows[0].id]).catch((e)=>console.error(e));
    
    res = await pool.query("SELECT * FROM facts WHERE tosend IS NOT NULL AND sended = false AND bad = false").catch(()=>null);
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
    pool.end();
}

module.exports = {send_fact}