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

}