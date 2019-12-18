/*
 
Cordova BCR Library 0.0.10
Authors: Gaspare Ferraro, Renzo Sala
Contributors: Simone Ponte, Paolo Macco
Filename: bcr.js
Description: demo app

*/

async function init() {
    console.log("init BCR");
    await bcr.initialize(ocrEngines.TESSERACT, cropStrategy.SMART, languages.ENGLISH, 2160, 1440, false, true);
    console.log("BCR initialized");
}

// app init
$(document).ready(function() {
    init().finally();
});


