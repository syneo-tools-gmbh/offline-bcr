/**
 * Cordova BCR Library 0.0.9
 * Authors: Gaspare Ferraro, Renzo Sala
 * Contributors: Simone Ponte, Paolo Macco
 * Filename: bcr.js
 * Description: main library
 *
 * @license
 * Copyright 2019 Syneo Tools GmbH. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// ************************************************************
// Enum values
// ************************************************************
const languages = {
    DANISH: "dan",
    GERMAN: "deu",
    ENGLISH: "eng",
    FRENCH: "fra",
    ITALIAN: "ita",
    SPANISH: "spa",
    SWEDISH: "swe"
};

const cropStrategy = {
    SMART: "smartcrop"
};

// ****************************************************************************
// Language Datasets
// ****************************************************************************
let languagesDS = {};

// ****************************************************************************
// BCR main class
// ****************************************************************************
let bcr = (function () {

    // ************************************************************
    // private properties (defaults)
    // ************************************************************
    let defaultMaxWidth = 2160;
    let defaultMaxHeight = 1440;
    let defaultLanguage = languages.ENGLISH;
    let defaultCropStrategy = cropStrategy.SMART;
    let defaultQRScanner = true;
    let inputOcr = "";
    let onlyBCR = false;
    let tesseractWorker;

    // ************************************************************
    // private methods
    // ************************************************************

    // get current script path
    let currentScriptPath = function () {

        let scripts = document.querySelectorAll('script[src]');
        let currentScript = scripts[scripts.length - 1].src;
        let currentScriptChunks = currentScript.split('/');
        let currentScriptFile = currentScriptChunks[currentScriptChunks.length - 1];

        return currentScript.replace(currentScriptFile, '');
    };

    // load files
    let loadJs = function (filename, callback, attrs) {
        console.log("Loading", filename);
        let scriptTag = document.createElement('script');

        if (typeof filename !== "undefined")
            scriptTag.src = filename;

        scriptTag.onload = callback;
        scriptTag.onreadystatechange = callback;

        if (typeof attrs !== "undefined") {
            for (let k in attrs)
                scriptTag[k] = attrs[k];
        }
        document.body.appendChild(scriptTag);
    };

    let executionPath = currentScriptPath();
    let WORKER_PATH = executionPath + 'tesseract/worker.min.js';
    let TESSERACT_PATH = executionPath + 'tesseract/tesseract-core.js';
    let LANG_PATH = executionPath + 'data/';

    // ************************************************************
    // public methods and properties
    // ************************************************************
    return {

        /**
         * initialize bcr reader given the ocr from google mobile vision text recognition API (cordova-plugin-mobile-ocr)
         * @param {bool} dynamicInclude if the references are included externally
         * @return {void} return promise
         */
        initializeForBCR: function (dynamicInclude = true) {

            return new Promise(resolve => {

                onlyBCR = true;

                if (dynamicInclude) {

                    // scripts to include
                    let scriptsURL = [];

                    // BCR library
                    scriptsURL.push("bcr.analyze.js");
                    scriptsURL.push("bcr.cleaning.js");
                    scriptsURL.push("bcr.utility.js");

                    // Language datasets
                    for (let k in languages)
                        scriptsURL.push("lang/" + languages[k] + ".js");

                    // Datasets
                    scriptsURL.push("bcr.cities.js");
                    scriptsURL.push("bcr.job.js");
                    scriptsURL.push("bcr.names.js");
                    scriptsURL.push("bcr.streets.js");

                    scriptsURL.push("qr/llqrcode.js");

                    // load next available script of callback if none
                    let nextLoad = function () {

                        // no more scripts
                        if (scriptsURL.length === 0) {
                            // done
                            resolve();
                        } else {
                            // load next script
                            let first = scriptsURL.shift();
                            if (typeof first === "string")
                                loadJs(executionPath + first, nextLoad);
                            else
                                loadJs(executionPath + first[0], nextLoad, first[1]);

                        }
                    };

                    nextLoad();
                } else {
                    resolve();
                }
            });

        },

        /**
         * initialize the bcr reader
         * @param {string} crop the crop strategy.
         * @param {string} language the language trained data.
         * @param {number} width max internal width.
         * @param {number} height max internal height.
         * @param {boolean} qrScanner enabled
         * @return {void} return promise
         */
        initialize: function (crop = defaultCropStrategy, language = defaultLanguage, width = defaultMaxWidth, height = defaultMaxHeight, qrScanner = defaultQRScanner) {
            return new Promise(resolve => {

                // check crop_strategy
                if (typeof width === "undefined") width = defaultMaxWidth;

                // check crop_strategy
                if (typeof height === "undefined") height = defaultMaxHeight;

                // check crop_strategy
                if (typeof crop === "undefined") crop = defaultCropStrategy;

                // check crop_strategy
                if (typeof language === "undefined") language = defaultLanguage;

                // Check QR Scanner
                if (typeof qrScanner === "undefined") qrScanner = defaultQRScanner;

                // assign defaults from init
                defaultMaxWidth = width;
                defaultMaxHeight = height;
                defaultCropStrategy = crop;
                defaultLanguage = language;
                defaultQRScanner = qrScanner;

                // scripts to include
                let scriptsURL = [];

                // BCR library
                scriptsURL.push("bcr.analyze.js");
                scriptsURL.push("bcr.cleaning.js");
                scriptsURL.push("bcr.utility.js");

                // Language datasets
                for (let k in languages)
                    scriptsURL.push("lang/" + languages[k] + ".js");

                // Datasets
                scriptsURL.push("bcr.cities.js");
                scriptsURL.push("bcr.job.js");
                scriptsURL.push("bcr.names.js");
                scriptsURL.push("bcr.streets.js");

                scriptsURL.push("qr/llqrcode.js");

                // Tesseract.js
                scriptsURL.push("tesseract/tesseract.min.js");

                // create tesseract engine
                let createTesseractEngine = function () {
                    window.Tesseract = Tesseract.create({
                        workerPath: WORKER_PATH,
                        langPath: LANG_PATH,
                        corePath: TESSERACT_PATH
                    });

                    // resolve after tesseract initialization
                    resolve();
                };

                // load next available script of callback if none
                let nextLoad = function () {

                    // no more scripts
                    if (scriptsURL.length === 0) {
                        // create engine and return promise
                        createTesseractEngine();
                    } else {
                        // load next script
                        loadJs(executionPath + scriptsURL.shift(), nextLoad);
                    }
                };

                nextLoad();

            });
        },

        // main method for recognizing
        recognizeBcr: function (b64image, callback, progress) {
            console.log("recognizeBCR", "start");
            // If qr Scanner enabled try to find some VCard
            if (bcr.qrScanner())
                QRCodeScanner(b64image, function (ret) {
                    // QRCode not found, fallback normal analysis
                    if (ret === undefined) {
                        console.log("recognizeBcr", "QR NOT FOUND");
                        loadAndProcess(b64image, callback, progress);
                    } else {
                        console.log("recognizeBcr", "QR FOUND", ret["fields"]);
                        let returnData = {
                            stages: [b64image],
                            result: ret["fields"],
                            blocks: []
                        };
                        callback(returnData);
                    }
                }, progress);
            else {
                loadAndProcess(b64image, callback, progress);
            }
            console.log("recognizeBCR", "end");
        },

        // main method for recognizing from ocr
        recognizeBcrFromOcr: function (ocr, callback, progress, b64image) {

            inputOcr = ocr;

            console.log("recognizeBCR", "start");

            // If qr Scanner enabled try to find some VCard
            if (bcr.qrScanner() && typeof b64image === "string")
                QRCodeScanner(b64image, function (ret) {
                    // QRCode not found, fallback normal analysis
                    if (ret === undefined) {
                        console.log("recognizeBcr", "QR NOT FOUND");
                        loadAndProcess(null, callback, progress);
                    } else {
                        console.log("recognizeBcr", "QR FOUND", ret["fields"]);
                        let returnData = {
                            stages: [b64image],
                            result: ret["fields"],
                            blocks: []
                        };
                        callback(returnData);
                    }
                }, progress);
            else {
                loadAndProcess(null, callback, progress);
            }
            console.log("recognizeBCR", "end");
        },

        /**
         * public property to expose the strategy set
         * @return {string}
         * the strategy label internally set
         */
        cropStrategy: function () {
            return defaultCropStrategy;
        },

        /**
         * public property to expose maxwidth default
         * @return {number}
         the value of the max width used internally to normalize the resolution
         */
        maxWidth: function () {
            return defaultMaxWidth;
        },

        /**
         * public property to expose maxheight default
         * @return {number}
         * the value of the max height used internally to normalize the resolution
         */
        maxHeight: function () {
            return defaultMaxHeight;
        },

        /**
         * public property to expose default language
         * @return {string}
         * the value of the language trained data
         */
        language: function () {
            return defaultLanguage;
        },

        /**
         * public property to expose the worker
         * @return {object}
         * the initialized tesseract worker
         */
        tesseract: function () {
            return tesseractWorker;
        },

        /**
         * public property to expose the ocr
         * @return {object}
         * the ocr passed
         */
        ocr: function () {
            return inputOcr;
        },

        /**
         * public property to expose the bcr strategy
         * @return {object}
         * if only BCR should be performed
         */
        onlyBCR: function () {
            return onlyBCR;
        },

        /**
         * public property to expose the QRScanner option
         * @return {boolean}
         * if VCard QRScanner read is enabled
         */
        qrScanner: function () {
            return defaultQRScanner;
        },

        /**
         * public method to extract data from a block
         * @param {string} text the text.
         * @param {string} resultField the field.
         * @return {string} the extracted field
         */
        extractField: function (text, resultField) {

            let result = text;

            if (resultField === "Name") {
                result = splitName(text);
            } else if (resultField === "Web") {
                result = extractWeb(text);
            } else if (resultField === "Email") {
                result = extractEmail(text);
            } else if (resultField === "Phone" || resultField === "Mobile" || resultField === "Fax") {
                result = extractNumber(text);
            } else if (resultField === "Address") {
                result = splitAddress(text);
            }

            return result;
        },

        /**
         * public method to refresh the derived field name
         * @param {object} nameField the text.
         * @return {object} the refreshed field
         */
        refreshName: function (nameField) {
            return refreshDerivedName(nameField);
        },

        /**
         * public method to refresh the derived field address
         * @param {object} addressField the text.
         * @return {object} the refreshed field
         */
        refreshAddress: function (addressField) {
            return refreshDerivedAddress(addressField);
        }

    };
})();
