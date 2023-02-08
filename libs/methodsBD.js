const { EmbedBuilder } = require("discord.js");
const { VK } = require("vk-io");

const symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
/**
 * Возвращает случайные элемент
 * @param {any[]} choices 
 * @returns 
 */
function choose(choices) {
	var index = Math.floor(Math.random() * choices.length);
	return choices[index];
}

/**
 * Возвращает случайно сгенерированный ключ
 * @returns 
 */
async function get_random_key(len = 128){
	var a="";
	for(let i=0;i<len;i++)a+=choose(symbols);
	return a;
}

/**
 * 
 * @param {VK} vk 
 * @param {{id:number,title?:string,text:string,color:string,images?:string[],type:0|1|2,start?:Date,interval?:number,end?:Date,time?:number[],channels_vk:string[],channels_discord:string[],enabled:boolean}} data 
 * @returns {Promise<{vk?:{send:string,channels:{files:PhotoAttachment,peer_ids:string}[]},discord?:{send:{embeds:EmbedBuilder[],files:string[]},channels:string[]}}>}
 */
async function send_to_channels(vk, data){try{

	let result = {};

	if(data.channels_discord){
		let embed = [], files = [];
		if(data.images?.length)
		for(let i of data.images){
			embed.push(new EmbedBuilder().setImage(i));
			if(i.startsWith("attachment://")){
				let name = i.replace("attachment://","");
				files.push({
					attachment: `../downloads/${name}`,
					name: `${name}`
				});
			}
		}if(!embed[0]) embed.push(new EmbedBuilder());

		if(data.title) embed[0].setTitle(data.title);
		embed[0].setDescription(data.text);
		for(let i of embed) i.setColor(data.color||"Blue");
		
		result.discord = {
			send:{embeds:embed,files:files},
			channels: data.channels_discord
		}
	}
	
	if(data.channels_vk){
		let text = data.title?`${data.title}\n${data.text}`:data.text;
		let peer_ids = [];
		for(let i=0;i<data.channels_vk.length;i+=100){
			let peers="";
			for(let j of data.channels_vk.slice(i,i+100))
				peers+=`${j},`;
			peer_ids.push(peers);
		}

		let attachments = [];
		for(let i of peer_ids){
			let files = [];
			if(data.images?.length)
			for(let j of data.images){
				files.push(await vk.upload.messageDocument({
					source:{
						values: [{value:j.replace("attachment://","../downloads/")}]
					},
					peer_ids:i
				}).catch((e)=>{console.error(e)}));
			}
			attachments.push({
				files: files,
				peer_ids: i
			});
		}
		result.vk = {
			send: text,
			channels: attachments
		}
	}

	return result;
	
}catch(e){console.error(e)}}

/**
 * 
 * @param {int[]} times 
 */
function get_date(times){
	if(!times) return null;
	let now = new Date();
	let day = now.getUTCHours>=20?(now.getUTCDay()+1)%7:now.getUTCDay();
	for(let i=0;i<8;i++){
		let new_day = (day+i)%7;
		if(typeof times[new_day] == "number"){
			let date = new Date(Date.UTC(
				now.getUTCFullYear(),
				now.getUTCMonth(),
				now.getUTCDate()+i,
				0,0,0,
				(times[new_day]-14400000)
				));
			if(date>Date.now()) return date;
		}
	}
	return null;
}

function test_channels(value, data){
	if(value?.channels_vk?.length&&!(data.permissions&(1<<7))){
		if(!data.channels_vk?.length) return false;
		for(let i of value.channels_vk){
			if(!data.channels_vk.includes(i))
				return false;
		}
	}

	if(value?.channels_discord?.length&&!(data.permissions&(1<<7))){
		if(!data.channels_discord?.length) return false;
		for(let i of value.channels_discord){
			if(!data.channels_discord.includes(i))
				return false;
		}
	}
	return true;
}

module.exports = {get_random_key, choose, send_to_channels, get_date, test_channels}