const express = require("express");
const {database} = require("../config.json");
const {Pool} = require("pg");
const pool = new Pool(database);
/**
 * 
 * @param {express.Express} app 
 */
module.exports = (app) => {
    app.get("/api/login", async(request, response, next)=>{
        response.status(200).json({permissions:request.session?.permissions});
        next();
    });

    app.patch("/api/users/me", async(request, response, next)=>{
        if(typeof request.body?.password != "string")
            return response.sendStatus(400);
        if(typeof request.body?.new_password != "string")
            return response.sendStatus(400);
        if(!request.body?.new_password.includes(" "))
            return response.sendStatus(418);
        if(request.body?.password != request.session?.password)
            return response.sendStatus(403);
        let res = await pool.query(
            "UPDATE users SET (password = $1) WHERE id = $2 RETURNING *",
            [request.body?.password, request.session?.id]
            ).catch((e)=>console.log(e));
        if(!res?.rows?.length) return response.sendStatus(500);
        response.sendStatus(200);
        next();
    });

    app.get("/api/users", async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<5)|(1<<6)))) return response.sendStatus(403);
        let res = await pool.query("SELECT * FROM users").catch((e)=>console.log(e));
        if(!res?.rows) return response.sendStatus(500);
        if(!res?.rows?.length) return response.status(200).json({users:[]});
        let result = [];
        if(request.session?.permissions&(1<<3))
            for(let i of res.rows){
                delete i.password;
                if(!(i.permissions&(1<<3)))
                    result.push(i);
            }
        else
        for(let i of res.rows){
            delete i.password;
            if(!(i.permissions&((1<<3)|(1<<5)|(1<<6))))
                result.push(i);
        }
        response.status(200).json({users:result});
    })

    app.get("/api/user/:id", async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<5)|(1<<6)))) return response.sendStatus(403);
        let res = await pool.query("SELECT * FROM users WHERE id = $1",[request.params.id]).catch((e)=>console.log(e));
        if(!res?.rows) return response.sendStatus(500);
        if(!res?.rows?.length) return response.sendStatus(404);
        if(res.rows[0]?.permissions&(1<<3)) return response.sendStatus(405);
        if((res.rows[0]?.permissions&((1<<5)|(1<<6)))&&(request.session?.permissions&((1<<5)|(1<<6)))) return response.sendStatus(403);
        response.status(200).json(res.rows[0]);
        next();
    })

    app.put("/api/user", async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<4)))) return response.sendStatus(403);
        if(typeof request.body.username != "string"||typeof request.body.password != "string") return response.sendStatus(400);
        if(request.body.username.includes(" ")||request.body.password.includes(" ")) return response.sendStatus(418);
        let res = await pool.query(
            "INSERT INTO users (username, password, permissions, created_on, channels_vk, channels_discord) VALUES ($1, $2, $3, NOW(), $4, $5) RETURNING *",
            [
                request.body.username,
                request.body.password,
                request.body.permissions||515,
                request.body.channels_vk?.length?request.body.channels_vk:null,
                request.body.channels_discord?.length?request.body.channels_discord:null
            ]).catch((e)=>console.log(e));
        if(!res?.rows?.length) return response.sendStatus(500);
        response.status(201).json({id:res.rows[0]?.id,username:res.rows[0]?.username});
        next();
    })

    app.patch("/api/user/:id", async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<5)))) return response.sendStatus(403);
        let res = await pool.query("SELECT * FROM users WHERE id = $1",[request.params.id]).catch((e)=>console.log(e));
        if(!res?.rows?.length)
            return response.sendStatus(404);
        if(res.rows[0]?.permissions&(1<<3))
            return response.sendStatus(405);
        let res1 = await pool.query("UPDATE users SET () WHERE id = $1",[request.params.id]).catch((e)=>console.log(e));
        next();
    })

    app.delete("/api/user/:id", async(request, response, next)=>{
        if(!(request.session?.permissions&((1<<3)|(1<<6)))) return response.sendStatus(403);
        let res = await pool.query("SELECT * FROM users WHERE id = $1",[request.params.id]).catch((e)=>console.log(e));
        if(!res?.rows?.length)
            return response.sendStatus(404);
        if(res.rows[0]?.permissions&(1<<3))
            return response.sendStatus(405);
        let res1 = await pool.query("DELETE FROM users WHERE id = $1 RETURNING *",[request.params.id]).catch((e)=>console.log(e));
        if(!res1?.rows?.length) return response.sendStatus(500);
        response.sendStatus(200);
        next();
    })
}