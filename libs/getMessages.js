const {Client, GatewayIntentBits, Message, EmbedBuilder,ActionRowBuilder,ButtonBuilder, Partials, ChannelType} = require('discord.js');
const { VK } = require("vk-io");
// const request = require('request');
// request.post({url: 'https://randstuff.ru/fact/'})

/**
 * 
 * @param {Client} bot 
 * @param {String} channel_id 
 * @param {Number} min_count 
 * @param {String} from_message 
 */
async function get_messages_discord(bot,channel_id,min_count=25,from_message=null){
    /**
     * @type {Message[]}
     */
    var res = [];
    var channel = await bot.channels.fetch(channel_id).catch(()=>null);;
    if(!channel?.messages||!channel.isTextBased()) return null;
    if(!min_count) min_count = 25;
    while(res.length<min_count){
        let messages = await channel.messages.fetch({limit:100,before:from_message}).catch(()=>null);;
        from_message = messages.last().id;
        messages.forEach((value,key,map)=>{
            if(value.author.id==bot.user.id)
                res.push(value);
        });
        if(!messages.size) return res.length?res:null;
    }
    return res.length?res:null;
}
/**
 * 
 * @param {VK} client 
 * @param {String} channel_id 
 * @param {Number} min_count 
 * @param {Number} from_message 
 */
async function get_messages_vk(client,channel_id,min_count=25,from_message=null){
    var res = [];
    if(!min_count) min_count = 25;
    while(res.length<min_count){
        let messages;
        if(from_message)
            messages = await client.api.messages.getHistory({count:200,start_message_id:from_message,peer_id:channel_id,offset:1,extended:1}).catch(()=>null);
        else messages = await client.api.messages.getHistory({count:200,peer_id:channel_id,extended:1}).catch(()=>null);
        from_message = messages.items[messages.items.length-1].id;
        for(let i of messages.items){
            if(i.from_id==messages?.conversations[0]?.chat_settings?.owner_id){
                i.date*=1000;
                res.push(i);
            }
                
        }
        if(messages.items.length) return res.length?res:null;
    }
    return res.length?res:null;
}
/**
 * 
 * @param {Client} bot 
 * @param {String} from_guild 
 */
async function get_guilds_discord(bot,from_guild=null){
    let guilds = await bot.guilds.fetch({limit:200,after:from_guild}).catch(()=>null);;
    var res = [];
    guilds.forEach((value)=>{
        res.push(value);
    });
    return res.length?res:null;
}
/**
 * 
 * @param {Client} bot 
 * @param {String} guild_id 
 * @returns {Promise<import('discord.js').Channel[]|null>} 
 */
async function get_channels_discord(bot,guild_id){
    var res = [];
    bot.guilds.cache.get(guild_id).channels.cache.forEach((value)=>{
        res.push(value);
    });
    return res.length?res:null;
}
/**
 * 
 * @param {VK} client 
 */
async function get_channels_vk(client){
    let result = [];
    let offset = 0;
    while(true){
        let res = await client.api.messages.getConversations({count:200,offset:offset>0?offset+1:0}).catch(()=>null);
        if(!res?.items?.length) return result?.length?result:null;
        for(let i of res.items)
            if(i.conversation?.peer?.type=="chat")
                result.push(i);
        offset+=200;
    }
}
module.exports = {get_messages_discord,get_messages_vk,get_guilds_discord,get_channels_discord,get_channels_vk}