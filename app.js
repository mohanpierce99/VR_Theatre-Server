const express = require("express");
const app = express();
const router = require('./router.js');
// var lib=require("./firebase-lib.js");


app.use("/serve",router());

app.listen(3400);
