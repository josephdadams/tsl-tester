const net = require('net');
const dgram	= require('dgram');
const fs = require('fs');
const path = require('path');
const {version}	= require('./package.json');
const clc = require('cli-color');
const util = require('util');

const config_file = getConfigFilePath(); //local storage JSON file

var SOCKET = null; //used for server connection

//server config default options
var IP = '127.0.0.1'; //default server IP
var PORT = 9800; //default server port
var TRANSPORT = 'udp'; //default transport method

var INTERVAL = null; //reference for the interval/timer if constantupdates are turned on
var TSLADDRESSES = []; //array of TSL Addresses and other data (loaded from config)

var SENDRATE = 100; //rate at which to send TSL data (in ms)

function getConfigFilePath() {
	const configFolder = './';
	if (!fs.existsSync(configFolder)) {
		fs.mkdirSync(configFolder, { recursive: true });
	}
	const configName = 'config.json';
	return path.join(configFolder, configName);
}

function loadConfig() { // loads the JSON data from the config file to memory
	logger('Loading the stored configuration file.', 'info');

	try {
		let rawdata = fs.readFileSync(config_file);
		let configJson = JSON.parse(rawdata);

		if (configJson.server_config) {
			if (configJson.server_config.ip) {
				IP = configJson.server_config.ip;
			}
			if (configJson.server_config.port) {
				PORT = parseInt(configJson.server_config.port);
			}
			if (configJson.server_config.transport) {
				TRANSPORT = configJson.server_config.transport;
			}
		}

		if (configJson.addresses) {
			logger(`Loading TSL Addresses: ${configJson.addresses.length} addresses/sources configured.`, 'info');
			TSLADDRESSES = configJson.addresses;
		}
	}
	catch (error) {
		if (error.code === 'ENOENT') {
			logger('The config file could not be found.', 'error');
		}
		else {
			logger('An error occurred while loading the configuration file:', 'error');
			logger(error, 'error');
		}
	}

	logger('Config Loading Complete.', 'info');

	ShowServerInfo();
	StartTSLConnection();
}

function ShowServerInfo() {
	logger(`Script Version: ${version}`, 'config');
	logger(`Server Address: ${IP}:${PORT}`, 'config');
	logger(`Transport Method: ${TRANSPORT}`, 'config');
}

function StartTSLConnection() {
	try {
		switch(TRANSPORT) {
			case 'udp':
				logger(`Initiating TSL UDP Socket.`, 'config');
				SOCKET = dgram.createSocket('udp4');
				startSending();
				SOCKET.on('error', function(error) {
					logger(`An error occurred with the connection to ${IP}:${PORT}  ${error}`, 'error');
				});
				SOCKET.on('connect', function() {
					logger(`TSL Connection Established: ${IP}:${PORT}`, 'config');
				});
				SOCKET.on('close', function() {
					logger(`TSL Connection Closed: ${IP}:${PORT}`, 'config');
				});
				break;
			case 'tcp':
				logger(`Initiating TSL TCP Socket.`, 'config');
				SOCKET = new net.Socket();
				SOCKET.on('error', function(error) {
					logger(`An error occurred with the connection to ${IP}:${PORT}  ${error}`, 'error');
				});
				SOCKET.on('connect', function() {
					logger(`TSL Connection Established: ${IP}:${PORT}`, 'config');
					startSending();
				});
				SOCKET.on('close', function () {
					logger(`TSL Connection Closed: ${IP}:${PORT}`, 'config');
				});
				SOCKET.connect(PORT, IP);
				break;
			default:
				break;
		}
	}
	catch (error) {
		logger(`An error occurred with the connection to ${IP}:${PORT}  ${error}`, 'error');
	}	
}

function StopTSLConnection() {
	try {
		switch(TRANSPORT) {
			case 'udp':
				logger(`Closing TSL UDP Socket.`, 'config');
				SOCKET.close();
				break;
			case 'tcp':
				logger(`Closing TSL TCP Socket.`, 'config');
				SOCKET.end();
				break;
			default:
				break;
		}
	}
	catch(error) {
		logger(`Error stopping TSL connection: ${error}`, 'error');
	}
}

function startSending() {
	logger(`Sending TSL Data to ${IP}:${PORT} (${TRANSPORT})`, 'config');
	//start an interval to send the first address with preview on, then wait 500ms, send program on (with preview off), then wait 500ms and move to the next address
	let curAddress = 0;
	let curTally = 1;

	INTERVAL = setInterval(() => {
		let address = TSLADDRESSES[curAddress];
		address.tally1 = 0;
		address.tally2 = 0;
		address.tally3 = 0;
		address.tally4 = 0;
		address[`tally${curTally}`] = 1;

		SendTSLData(address.address);

		if (curTally === 4) {
			curTally = 1;
			curAddress++;
			if (curAddress === TSLADDRESSES.length) {
				curAddress = 0;
			}
		}
		else {
			curTally++;
		}
	}, SENDRATE);
}

function SendTSLData(addressNumber) {
	try {
		let tslAddress = TSLADDRESSES.find(ADDRESS => ADDRESS.address === addressNumber);

		if (tslAddress) {
			//build the tally object
			let bufUMD = Buffer.alloc(18, 0); //ignores spec and pad with 0 for better aligning
			bufUMD[0] = 0x80 + addressNumber;
			bufUMD.write(tslAddress.label, 2);
	
			let data = {};
	
			data.tally1 = tslAddress.tally1;
			data.tally2 = tslAddress.tally2;
			data.tally3 = tslAddress.tally3;
			data.tally4 = tslAddress.tally4;
	
			let bufTally = 0x30;
	
			if (data.tally1) {
				bufTally |= 1;
			}
			if (data.tally2) {
				bufTally |= 2;
			}
			if (data.tally3) {
				bufTally |= 4;
			}
			if (data.tally4) {
				bufTally |= 8;
			}
			bufUMD[1] = bufTally;
	
			//send the tally object to the server
			logger(`Sending TSL data for ${tslAddress.label} to ${IP}:${PORT} (${TRANSPORT})`, 'info');
			logger(`${tslAddress.label}: Preview: ${Boolean(data.tally1)}`, 'preview');
			logger(`${tslAddress.label}: Program: ${Boolean(data.tally2)}`, 'program');
			switch(TRANSPORT) {
				case 'udp':
					sendTSL_UDP(bufUMD);
					break;
				case 'tcp':
					sendTSL_TCP(bufUMD);
					break;
			}
		}
	}
	catch(error) {
		logger(`Error creating TSL UMD Object: ${error}`, 'error');
	}	
}

function sendTSL_UDP(buffer) {
	try {
		SOCKET.send(buffer, PORT, IP);
	}
	catch(error) {
		logger(`Unable to send TSL UDP: ${error}`, 'error');
	}
}

function sendTSL_TCP(buffer) {
	try {
		SOCKET.write(buffer);
	}
	catch(error) {
		logger(`Unable to send TSL TCP: ${error}`, 'error');
	}
}

function logger(log, type) { //logs the item to the console

	let dtNow = new Date();

	if (type === undefined) {
		type = 'info';
	}

	switch(type) {
		case 'info':
			console.log(`[${dtNow}]     ${log}`);
			break;
		case 'config':
			console.log(`[${dtNow}]     ${clc.blue.bold(log)}`);
			break;
		case 'preview':
			console.log(`[${dtNow}]     ${clc.green.bold(log)}`);
			break;
		case 'program':
			console.log(`[${dtNow}]     ${clc.red.bold(log)}`);
			break;
		case 'error':
			console.log(`[${dtNow}]     ${clc.magenta.bold(log)}`);
			break;
		default:
			console.log(`[${dtNow}]     ${util.inspect(log, {depth: null})}`);
			break;
	}
}

process.on('SIGINT', _ => {
	logger(`Process exiting:`, 'config');
	StopTSLConnection();
	process.exit(0);
});

loadConfig();