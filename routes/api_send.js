const express = require("express");
const {database} = require("../config.json");
const {Pool} = require("pg");
const {get_channels_vk,get_channels_discord,get_guilds_discord} = require("../libs/getMessages");
const { mainTimer } = require("../libs/mainTimer");
const { test_channels } = require("../libs/methodsBD");
/**
 * 
 * @param {express.Express} app 
 * @param {mainTimer} mt 
 */
module.exports = (app, mt) => {
    app.get("/api/send",async(request, response, next)=>{
        let permissions = request.session?.permissions;
        if(!(permissions&((1<<3)|(1<<1)|(1<<0))))
            return response.sendStatus(403);
        let res = await mt.get_all();
        if(!res) return response.sendStatus(500);
        if(!(permissions&(1<<3)) && !((permissions&(1<<7))&&(permissions&(1<<8)))){
            res = res.filter((value)=>test_channels(value,request.session));
        }
        response.status(200).json({result:res});
        next();
    });

    app.get("/api/send/:id",async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<1)|(1<<0))))
            return response.sendStatus(403);
        let res = await mt.get(request.params.id);
        if(!res) return response.sendStatus(404);
        response.status(200).json(res);
        next();
    });

    app.put("/api/send",async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<0))))
            return response.sendStatus(403);
        let data = request.body;
        if(!data.channels_vk?.length&&!data.channels_discord?.length)
            return response.sendStatus(418);
        if(!data.text) return response.sendStatus(400);
        if(!data.type) data.type = 0;
        if(!data.color) data.color = "#0000ff";
        if(data.type==1&&!data.interval) data.interval = 24*60*60*1000;
        let res = await mt.add(data).catch((e)=>console.error(e));
        if(!res) return response.sendStatus(500);
        response.sendStatus(201);next();
    });
    
    app.delete("/api/send/:id",async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<1))))
            return response.sendStatus(403);
    });

    app.patch("/api/send/:id",async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<1))))
            return response.sendStatus(403);
            
    });

    app.patch("/api/send/:id/enable",async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<1))))
            return response.sendStatus(403);
        let res = null;
        if(request.session?.permissions&(1<<3))
            res = await mt.enable(request.params.id).catch((e)=>console.error(e))
        else if(request.session?.permissions&(1<<1)){
            if((request.session?.permissions&(1<<7))&&(request.session?.permissions&(1<<8)))
                res = await mt.enable(request.params.id).catch((e)=>console.error(e))
            else if(test_channels(await mt.get(request.params.id), request.session))
                res = await mt.enable(request.params.id).catch((e)=>console.error(e))
            else return response.sendStatus(403);
        }else return response.sendStatus(403);
        if(!res) return response.sendStatus(500);
        response.sendStatus(200);
    });

    app.patch("/api/send/:id/disable",async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<1))))
            return response.sendStatus(403);
        let res = null;
        if(request.session?.permissions&(1<<3))
            res = await mt.disable(request.params.id).catch((e)=>console.error(e))
        else if(request.session?.permissions&(1<<1)){
            if((request.session?.permissions&(1<<7))&&(request.session?.permissions&(1<<8)))
                res = await mt.disable(request.params.id).catch((e)=>console.error(e))
            else if(test_channels(await mt.get(request.params.id), request.session))
                res = await mt.disable(request.params.id).catch((e)=>console.error(e))
            else return response.sendStatus(403);
        }else return response.sendStatus(403);
        if(!res) return response.sendStatus(500);
        response.sendStatus(200); 
    });
    
}