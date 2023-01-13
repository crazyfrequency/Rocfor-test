const express = require("express");
const {database} = require("../config.json");
const {Pool} = require("pg");
const { get_channels_discord, get_guilds_discord, get_channels_vk, get_messages_discord, get_messages_vk } = require("../libs/getMessages");
const { VK } = require("vk-io");
const { Client } = require("discord.js");
/**
 * 
 * @param {express.Express} app 
 * @param {VK} client 
 * @param {Client} bot 
 */
module.exports = (app, client, bot) => {

    app.get("/api/discord/guilds", async (request, response)=>{
        let permissions = request.session?.permissions;
        if(!(permissions&((1<<3)|(1<<1)|(1<<0)|(1<<10)|(1<<9)))) return response.sendStatus(403);
        let guilds = await get_guilds_discord(bot, request.query?.from||null).catch(()=>null);
        if(!guilds) return response.sendStatus(500);
        let result = [];
        for(let i of guilds){
            result.push({
                id:i.id,
                name:i.name,
                icon:i.iconURL({forceStatic:true}),
                owner:i.owner
            });
        }
        response.status(200).json(result);
    });

    app.get("/api/discord/guilds/:guild_id/channels", async (request, response)=>{
        let permissions = request.session?.permissions;
        if(!(permissions&((1<<3)|(1<<1)|(1<<0)|(1<<10)|(1<<9)))) return response.sendStatus(403);
        let channels = await get_channels_discord(bot, request.params?.guild_id).catch(()=>null);
        if(!channels?.length) return response.sendStatus(404);
        if(permissions&((1<<3)|(1<<8))) return response.status(200).json(channels);
        let result = [];
        for(let i of channels){
            if(i.type==4||(i.id in (request.session?.channels_discord||[])))
                result.push(i);
        }
        response.status(200).json(result);
    });

    app.get("/api/vk/channels", async (request, response)=>{
        let permissions = request.session?.permissions;
        if(!(permissions&((1<<3)|(1<<1)|(1<<0)|(1<<10)|(1<<9)))) return response.sendStatus(403);
        let channels = await get_channels_vk(client).catch(()=>null);
        if(!channels?.length) return response.sendStatus(500);
        channels.forEach((value,index)=>channels[index] = {
            id: value.conversation?.peer?.id,
            type: value.conversation?.peer?.type,
            local_id: value.conversation?.peer?.local_id,
            name: value.conversation?.chat_settings?.title,
            members_count: value.conversation?.chat_settings?.members_count,
            icons: value.conversation?.chat_settings?.photo
        });
        if(permissions&((1<<3)|(1<<7))) return response.status(200).json(channels);
        let result = [];
        for(let i of channels){
            if(i?.id in (request.session?.channels_discord||[]))
            result.push(i);
        }
        response.status(200).json(result);
    });

    app.get("/api/discord/channels/:channel_id/messages", async (request, response)=>{
        let permissions = request.session?.permissions;
        if(!(permissions&((1<<3)|(1<<10)|(1<<9)))) return response.sendStatus(403);
        if(!(permissions&((1<<3)|(1<<8))))
            if(!(request.params.channel_id in (request.session?.channels_discord||[])))
                return response.sendStatus(403);
        let messages = await get_messages_discord(
            bot, request.params.channel_id,
            request.query?.min||null, request.query?.from||null
            ).catch(()=>null);
        if(!messages?.length) return response.sendStatus(404);
        messages.forEach((value, index)=>{
            let embed={image:null,color:null,title:null,description:null};
            if(value?.embeds?.length){
                embed.color = value.embeds[0]?.color;
                embed.title = value.embeds[0]?.title;
                embed.description = value.embeds[0]?.description;
                for(let i of value.embeds){
                    if(i?.image?.url){
                        embed.image = i.image.url;
                        break;
                    }
                }
            }
            if(typeof embed.title == "string"){
                embed.title=embed.title.replace(/\[([^\]]{1,})\]\([^\)]{1,}\)/gm, "$1");
                if(embed.title.length>16)
                    embed.title=embed.title.substring(0,13)+"...";
            }
                
            if(typeof embed.description == "string"){
                embed.description=embed.description.replace(/\[([^\]]{1,})\]\([^\)]{1,}\)/gm, "$1");
                if(embed.description.length>256)
                    embed.description=embed.description.substring(0,253)+"...";
            }

            messages[index] = {
                channelId:value.channelId,
                guildId:value.guildId,
                id:value.id,
                image:embed.image||null,
                color:embed.color||null,
                title:embed.title||null,
                description:embed.description||value.content,
                tts:value.tts,
                editedTimestamp: value.editedTimestamp,
                createdTimestamp:value.createdTimestamp
            };
        });
        response.status(200).json(messages);
    });

    app.get("/api/vk/channels/:channel_id/messages", async (request, response)=>{
        let permissions = request.session?.permissions;
        if(!(permissions&((1<<3)|(1<<10)|(1<<9)))) return response.sendStatus(403);
        if(!(permissions&((1<<3)|(1<<7))))
            if(!(Number(request.params.channel_id) in (request.session?.channels_vk||[])))
                return response.sendStatus(403);
        let messages = await get_messages_vk(
            client, request.params.channel_id,
            request.query?.min||null, request.query?.from||null
            ).catch(()=>null);
        if(!messages?.length) return response.sendStatus(404);
        messages.forEach((value, index)=>{
            if(typeof value.text == "string"){
                value.text=value.text.replace(/\[(https:\/\/|http:\/\/|)(vk.com\/|)([a-zA-Z0-9\-_]{1,})\|([^\]]{1,})\]/gm, "$4");
                if(value.text.length>256)
                value.text=value.text.substring(0,253)+"...";
            }let photo = null;
            if(value.attachments?.length){
                for(let i of value.attachments){
                    if(i.type=="photo"){
                        let sizes = [];
                        for(let j of i.photo.sizes)
                            sizes.push(j.height)
                        let max = Math.max(...sizes);
                        photo = i.photo.sizes.find(val => val.height==max).url
                        break;
                    }
                }
            }
            messages[index] = {
                peer_id:value.peer_id,
                id:value.id,
                image:photo,
                text:value.text,
                date:value.date
            };
        });
        response.status(200).json(messages);
    });

    app.get("/api/discord/channels/:channel_id/messages/:message_id", async (request, response)=>{
        let permissions = request.session?.permissions;
        if(!(permissions&((1<<3)|(1<<10)|(1<<9)))) return response.sendStatus(403);
        if(!(permissions&((1<<3)|(1<<8))))
            if(!(request.params.channel_id in (request.session?.channels_discord||[])))
                return response.sendStatus(403);
        response.sendStatus(503);
    });

    app.get("/api/vk/channels/:channel_id/messages/:message_id", async (request, response)=>{
        let permissions = request.session?.permissions;
        if(!(permissions&((1<<3)|(1<<10)|(1<<9)))) return response.sendStatus(403);
        if(!(permissions&((1<<3)|(1<<7))))
            if(!(Number(request.params.channel_id) in (request.session?.channels_vk||[])))
                return response.sendStatus(403);
        response.sendStatus(503);
    });

}