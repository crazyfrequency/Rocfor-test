const express = require("express");
const {database} = require("../config.json");
const {Pool} = require("pg");
const {get_random_key} = require("../libs/methodsBD");
const pool = new Pool(database);
/**
 * 
 * @param {express.Express} app 
 */
module.exports = (app) => {
    app.get("/main/*",async(request, response, next)=>{
        response.sendFile("C:/Users/diefi/Desktop/site1/site/pages/main_copy.html")
    });
    
    app.post("/api/login",async(request, response)=>{
        if(typeof request.body.username != "string" || typeof request.body.password != "string")
            return response.sendStatus(400);
        if(request.body.username?.includes(" ")||request.body.password?.includes(" "))
            return response.sendStatus(418);
        let res = await pool.query(
            "SELECT * FROM users WHERE username = $1 AND password = $2",
            [request.body.username,request.body.password]
        ).catch(async(e)=>e.errno==-4077?"nc":null);

        if(res=="nc")
            return response.sendStatus(500);
        if(!res?.rowCount)
            return response.sendStatus(401);
        

        let key;
        while(true){
            key = await get_random_key();
            let res1 = await pool.query(`SELECT * FROM sessions WHERE secretkey = '${key}'`).catch(()=>null)
            if(!res1)
                return response.sendStatus(500);
            if(!res1?.rowCount) break;
        }

        let res2 = await pool.query(
            "INSERT INTO sessions (secretkey, user_id, useragent, lastlogin) VALUES ($1, $2, $3, NOW())",
            [key,res?.rows[0]?.id,request.headers["user-agent"]]
        ).catch(async(e)=>e.errno==-4077?"nc":null);
        if(res2=="nc") return response.sendStatus(500);
        response.cookie("key",key,{
            maxAge:1209600000,
            httpOnly:true,
            path:"/api"
        });
        response.status(200).json({permissions:res?.rows[0]?.permissions});
    });

    app.post("/api/logout",async(request, response)=>{
        response.clearCookie("key",{path:"/api"});
        await pool.query(
            "DELETE FROM sessions WHERE secretkey = $1",
            [request.cookies.key]
        ).catch(()=>null);
        response.sendStatus(200);
    });
    
    app.use("/api/*",async (request, response, next)=>{
        if(!request.cookies.key) return response.sendStatus(401);
        let res = await pool.query(
            "SELECT * FROM sessions INNER JOIN users ON user_id = id WHERE secretkey = $1",
            [request.cookies.key]
        ).catch(async(e)=>e.errno==-4077?"nc":null);
        
        if(res=="nc")
            return response.sendStatus(500);
        if(!res?.rowCount)
            return response.sendStatus(401);
        if(Date.now()-res.rows[0].lastlogin>1209600000){
            pool.query("DELETE FROM sessions WHERE (NOW()-lastlogin)>'14days'").catch((e)=>console.error(e));
            return response.sendStatus(401);
        }
        pool.query("UPDATE sessions SET lastlogin=NOW(), useragent=$1 WHERE secretkey = $2",
        [request.headers["user-agent"],request.cookies.key]).catch((e)=>console.error(e));
        response.cookie("key",request.cookies.key,{
            maxAge:1209600000,
            httpOnly:true,
            path:"/api"
        })
        request.session = res.rows[0];
        next();
    });
}