const express = require("express");
const {database} = require("../config.json");
const {Pool} = require("pg");
const { choose } = require("../libs/methodsBD");
/**
 * 
 * @param {express.Express} app 
 */
module.exports = (app) => {
    app.get("/api/facts", async(request, response, next)=>{
        if(!request.session?.permissions&((1<<3)|(1<<2))) return response.sendStatus(403);
        const pool = new Pool(database);
        let res = await pool.query("SELECT * FROM facts WHERE tosend IS NOT NULL AND sended = false AND bad = false ORDER BY tosend").catch((e)=>console.log(e));
        pool.end();
        if(!res?.rows?.length) return response.sendStatus(500);
        let facts=[];
        for(let i of res.rows){
            facts.push({
                id: i.id,
                text: i.text
            });
        }
        response.status(200).json({facts:facts});
    });

    app.delete("/api/fact/:id", async(request, response, next)=>{
        if(!request.session?.permissions&((1<<3)|(1<<2))) return response.sendStatus(403);
        const pool = new Pool(database);
        let res = await pool.query("SELECT * FROM facts WHERE id=$1",[request.params.id]).catch((e)=>console.error(e));
        if(!res?.rows?.length){
            pool.end();
            return response.sendStatus(418);
        }
        if(res.rows[0]?.sended||res.rows[0]?.bad){
            pool.end();
            return response.sendStatus(418);
        }
        if(res.rows[0]?.tosend){
            let res1 = await pool.query("SELECT * FROM facts WHERE tosend IS NULL AND sended = false AND bad = false").catch(()=>null);
            if(!res1?.rows?.length){
                response.sendStatus(500);
                return pool.end();
            }
            let fact = choose(res1.rows);
            await pool.query("UPDATE facts SET tosend=$1 WHERE id=$2",[res.rows[0]?.tosend, fact.id]).catch(()=>null);
        }
        let res2 = await pool.query("UPDATE facts SET bad=true WHERE id=$1",[request.params.id]).catch((e)=>console.error(e));
        pool.end();
        if(!res2) return response.sendStatus(500);
        response.sendStatus(200);
        next();
    });
    
}