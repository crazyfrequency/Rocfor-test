const express = require("express");
const {database} = require("../config.json");
const {Pool} = require("pg");
/**
 * 
 * @param {express.Express} app 
 */
module.exports = (app) => {
    app.use("/api/*",async(request, response, next)=>{try{
        if(!response.headersSent) return response.sendStatus(404);
        let pool = new Pool(database);
        await pool.query(
            "INSERT INTO audit_log(user_id, user_name, url, ip, headers, operation_date, body, status_code)"+
            " VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)",
            [
                request.session?.id||null, request.session?.username||null,
                request.method+" "+request.originalUrl, request.ip||null,
                request.rawHeaders.toString(), JSON.stringify(request.body),
                response.statusCode
            ]
            ).catch(()=>null);
        pool.end();
    }catch(e){console.error(e)}});
    
    app.all("*",async(request, response, next)=>{
        response.redirect("/main/");
    });
}