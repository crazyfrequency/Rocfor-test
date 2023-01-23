const {database} = require("../config.json");
const {Pool} = require("pg");
const { Client } = require("discord.js");
const { VK } = require("vk-io");
const { send_to_channels, get_date } = require("./methodsBD");
const pool = new Pool(database);
class mainTimer{
    /**
     * 
     * @param {Client} bot 
     * @param {VK} vk 
     */
    constructor(bot, vk){
        /**
         * @type {{interval:any|null,data:{}}[]}
         * @private
         */
        this.sends={};
        this.vk = vk;
        this.bot = bot;
        this.started = false;
    }

    async start(){
        let res = await pool.query("SELECT * FROM sends");
        if(!res?.rows?.length) return this.started = true;
        for(let i of res.rows){
            if(typeof i?.interval == "object")
                i.interval = (((i.interval?.hours||0)*60+(i.interval?.minutes||0))*60+(i.interval?.seconds||0))*1000+(i.interval?.milliseconds||0);
            this._create_interval(i).catch((e)=>console.error(e));
        }
        this.started = true;
    }

    /**
     * 
     * @param {{id:number,title?:string,text:string,color:string,images?:string[],type:0|1|2,start?:Date,channels_vk?:string[],channels_discord?:string[]}} data 
     * @private 
     */
    async _send(data){
        let res = data._send;
        if(res.vk?.channels){
            for(let i of res.vk.channels){
                this.vk.api.messages.send({
                    message:res.vk?.send,
                    peer_ids:i.peer_ids,
                    attachment:i.files,
                    random_id:+new Date()
                }).catch(()=>null)
            }
        }if(res.discord?.channels){
            for(let i of res.discord?.channels){
                let channel = await this.bot.channels.fetch(i).catch(()=>null);
                if(channel?.send){
                    channel.send(res.discord?.send).catch(()=>null);
                }
            }
        }
    }

    /**
     * 
     * @param {{id:number,title?:string,text:string,color:string,images?:string[],type:0|1|2,start?:Date,channels_vk?:string[],channels_discord?:string[],enabled:boolean}} data 
     * @private
     */
    async _interval_0(data){
        this.sends[data.id].interval = setTimeout(async()=>{
            await this._send(data).catch(()=>null);
            await pool.query("DELETE FROM sends WHERE id=$1",[data.id]).catch((e)=>console.error(e));
            delete this.sends[data.id];
        },(data.start-Date.now()));
    }

    /**
     * 
     * @param {{id:number,title?:string,text:string,color:string,images?:string[],type:0|1|2,start?:Date,interval?:number,end?:Date,channels_vk?:string[],channels_discord?:string[],enabled:boolean}} data 
     * @private
     */
    async _interval_1(data){
        console.debug(data);
        if(data.end!==null)
            if(data.end<Date.now()) return delete this.sends[data.id];
        
        this.sends[data.id].interval = setTimeout(async()=>{
            if(data.end!==null)
                if(data.end<Date.now()) return delete this.sends[data.id];
            await this._send(data).catch(()=>null);
            this.sends[data.id].interval = setInterval(async()=>{
                if(data.end!==null)
                    if(data.end<Date.now()) return delete this.sends[data.id];
                await this._send(data).catch(()=>null);
            },data.interval);
        },(data.start - Date.now())<5000?(data.interval-Math.abs((Date.now()-data.start)%data.interval)):(data.start - Date.now()));
    }

    /**
     * 
     * @param {{id:number,title?:string,text:string,color:string,images?:string[],type:0|1|2,start?:Date,end?:Date,time?:number[],channels_vk?:string[],channels_discord?:string[],enabled:boolean}} data 
     * @private
     */
    async _interval_2(data){

        let date = get_date(data.time);
        

        this.sends[data.id].interval = setTimeout(async()=>{
            if(!this.sends[data.id]) return;
            await this._send(data).catch(()=>null);
            this._interval_2(data);
        },date-Date.now());
    }
    
    /**
     * 
     * @param {{id:number,title?:string,text:string,color:string,images?:string[],type:0|1|2,start?:Date,interval?:number,end?:Date,time?:number[],channels_vk:string[],channels_discord:string[],enabled:boolean}} data 
     * @private
     */
    async _create_interval(data){
        if(!data.enabled) return;
        if(!data.id) return;
        data._send = await send_to_channels(this.vk,data);
        this.sends[data.id] = {
            interval: null,
            data:data
        }
        if(data.type==0)
            await this._interval_0(data)
        else if(data.type==1)
            await this._interval_1(data)
        else if(data.type==2)
            await this._interval_2(data)
        else delete this.sends[data.id];
            
    }

    /**
     * 
     * @param {{id:number,title?:string,text:string,color:string,images?:string[],type:0|1|2,start?:Date,interval?:number,end?:Date,time?:number[],channels_vk:string[],channels_discord:string[]}} data 
     */
    async add(data){
        if(!this.started) return;
        if(!data.color) data.color = "#0000ff";
        if(!data.start&&data.type==1) data.start = Date.now();
        let res = await pool.query(
            "INSERT INTO sends (title, \"text\", color, images, \"type\", \"start\", \"interval\", \"end\", \"time\", enabled, channels_vk, channels_discord) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
            [
                data.title||null,
                data.text, data.color,
                data.images?.length?data.images:null,
                data.type, data.start?new Date(data.start):null,
                data.interval/1000||null,
                data.end?new Date(data.end):null,
                data.time?.length?data.time:null,
                true,
                data.channels_vk?.length?data.channels_vk:null,
                data.channels_discord?.length?data.channels_discord:null
            ]
            ).catch((e)=>console.error(e));
        if(!res?.rows?.length) return null;
        if(!res?.rows[0]?.id) return null;
        data.id = res.rows[0]?.id;
        data.enabled = true;
        this._create_interval(data);
        return res.rows[0]?.id;
    }

    /**
     * 
     * @param {number} id 
     * @param {{id:number,title?:string,text:string,color:string,images?:string[],type:0|1|2,start?:Date,interval?:number,end?:Date,time?:number[],channels_vk:string[],channels_discord:string[]}} data 
     */
    async edit(id, data){//не доработано
        if(!this.started) return;
        let res = await pool.query("SELECT * FROM sends WHERE id = $1",[id]).catch(()=>null);
        if(!res?.rows?.length) return null;
        clearInterval(this.sends[id]?.interval);clearTimeout(this.sends[id]?.interval);
        delete this.sends[id];

        let res1 = await pool.query(
            "UPDATE sends SET title=$1, \"text\"=$2, color=$3, images=$4, type=$5, start=$6, interval=$7, end=$8, time=$9, enabled=$10, channels_vk=$11, channels_discord=$12 WHERE id=$13",
            [
                data.title||null,
                data.text, data.color,
                data.images?.length?data.images:null,
                data.type, data.start||null,
                data.interval||null,
                data.end||null,
                data.time?.length?data.time:null,
                true,
                data.channels_vk?.length?data.channels_vk:null,
                data.channels_discord?.length?data.channels_discord:null,
                id
            ]
            ).catch(()=>null);
        if(!res1?.rows?.length) return null;
        if(!res1?.rows[0]?.id) return null;
        data.id = res1.rows[0]?.id;
        data.enabled = true;
        this._create_interval(data);
        return res1.rows[0]?.id;
    }

    async delete(id){
        if(!this.started) return;
        await pool.query("DELETE FROM sends WHERE id = $1 RETURNING *",[id]).catch(()=>null);
        clearInterval(this.sends[id]?.interval);clearTimeout(this.sends[id]?.interval);
        delete this.sends[id];
    }

    async disable(id){
        if(!this.started) return;
        let res = await pool.query("UPDATE sends SET enabled = false WHERE id = $1 RETURNING *", [id]).catch(()=>null);
        clearInterval(this.sends[id]?.interval);clearTimeout(this.sends[id]?.interval);
        delete this.sends[id];
        return true;
    }

    async enable(id){
        if(!this.started) return;
        let res = await pool.query("UPDATE sends SET enabled = true WHERE id = $1 RETURNING *", [id]).catch(()=>null);
        if(!res?.rows?.length) return null;
        res.rows[0].enabled = true;
        this._create_interval(res.rows[0]);
        return true;
    }

    async get_all(){
        let res = await pool.query("SELECT * FROM sends");
        if(!res?.rows) return null;
        for(let i of res.rows){
            if(!(i.id in this.sends)&&i.enabled) i.bad = true;
            delete i.start;delete i.interval;delete i.end;
            delete i.time;
            if(i.images) i.images = i.images[0];
            if(i.channels_vk?.length) i.channels_vk = true;
            if(i.channels_discord?.length) i.channels_discord = true;
        }
        return res.rows;
    }

    async get(id){
        let res = await pool.query("SELECT * FROM sends WHERE id = $1",[id]);
        if(!res?.rows?.length) return null;
        return res.rows[0];
    }

}

module.exports = {mainTimer}