const express = require('express');
const app = express();
const http = require('http');
const WebSocket = require('ws');
const server = http.createServer(app);
app.use(express.static('public'));
const wss = new WebSocket.Server({ server });

let scoreBoard = [
    {name: "LamPi-Team", time: 6399}
];

Array.prototype.nextLED = function (b) {
    let a = this[Math.floor(Math.random() * this.length)];
    while (b.includes(a))
        a = this[Math.floor(Math.random() * this.length)];
    return a;
};

const LEDs = [
    {c:1,  sn:"6E:D1:5B:63"},
    {c:2,  sn:"2E:5D:64:63"},
    {c:3,  sn:"AE:F0:5E:63"},
    {c:4,  sn:"4E:EA:60:63"},
    {c:5,  sn:"AE:A9:F9:C3"},
    {c:6,  sn:"EE:CB:5A:63"},
    {c:7,  sn:"E:9F:1:C4"  },
    {c:8,  sn:"9E:46:5F:63"},
    {c:9,  sn:"EE:25:64:63"},
    {c:10, sn:"AE:1F:61:63"},
    {c:11, sn:"7E:F9:5F:63"},
    {c:12, sn:"CE:FB:59:63"},
    {c:13, sn:"7E:C5:5E:63"},
    {c:14, sn:"7E:B:61:63" },
    {c:15, sn:"2E:84:1:C4" }
];

let reachedLEDs = [];

let currentLED = LEDs.nextLED(reachedLEDs);

app.all('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html');
});

app.get('/highScoreList', (req, res) => {
	res.sendFile(__dirname + '/public/highscorelist.html');
});

function heartbeat() {
    this.isAlive = true;
}

wss.on('connection', function connection(socket, req) {

    socket.isAlive = true;
    socket.on('pong', heartbeat);

	console.log('A new Client connected from ' + req.connection.remoteAddress);

	socket.on("message", message => {
	    console.log("Message received from client: " + message);
	    message = JSON.parse(message);

	    switch (message.message) {
            case "device":
                socket.device = message.device;
                onDevice();
                break;
            case "control":
                onCtrlCar(message.action);
                break;
            case "over-led":
                onOverLED(message.data.sn);
                break;
            default:
                console.log("Unknown Message dropped!");
                break;
        }

    });

	function onDevice() {
	    console.log("The Client is a " + socket.device);
        switch(socket.device) {
            case "user":
                console.info("------- GAME STARTED -------");
                console.info("STARTING WITH LED " + currentLED.c);
                break;
            case "scoreboard":
                updateHighscores();
                break;
        }
    }

    function onCtrlCar(action) {
	    let data = {
	        message: "control",
            device: "server",
            data: {
                action: action
            }
        };
        wss.toDevice("car", data);
    }

    function onOverLED(sn){
        console.log("Car drove over LED with uid " + sn);
        if (sn === currentLED.sn) {
            // Car drove over correct LED
            chooseLED();
            console.info("THUS CHANGING LED TO " + currentLED.c);
            wss.toDevice("user", {message: "led-counter", device: "server", data: {action: "++"}});
        }
    }


    /**
     * Updating Highscore List
     */

    function updateHighscores() {
        let data = {
            message: "update-scores",
            device: "server",
            data: {
                scores: scoreBoard
            }
        };
        wss.toDevice("scoreboard", data);
    }

    /**
     * Choosing a LED
     */



    function chooseLED() {
        let temp = currentLED;
        currentLED = LEDs.nextLED(reachedLEDs);
        let data = {
            message: "update-scores",
            device: "server",
            data: {
                led: currentLED
            }
        };
        wss.toDevice("base", data);
        reachedLEDs.push(temp);
    }




    /**
     * Handling the on_disconnect Event
     */

    socket.on('disconnect', () => {
        console.log(device+" has disconnected from the Server.....");
    });


    wss.prototype.toDevice = (device, data) => {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client.device === device) {
                client.send(JSON.stringify(data));
            }
        });
    };
/*

	socket.on("Echo", data => {
	    console.log("Echo received");
	    console.info(data);
	    socket.emit("Echo", data);
    });

	socket.on("device-car", (data) => {
		// code when a car connects to the server
        device = "Car";
		console.log("The Client is a Car");
		socket.join("Car");
	});

	socket.on("device-user", (data) => {
		// code when a user starts a game
        device = "User";
		console.log("The Client is a User");
		console.log("With the Username " + data.name + " and the uid " + data.uid);
		socket.join("User/" + data.name);
		console.info("------- GAME STARTED -------");
		chooseLED();
		console.info("STARTING WITH LED " + currentLED.c);
	});

	socket.on("device-base", data => {
		// code when the base/board is connected
        device = "Base";
		console.log("The Client is the Base");
		socket.join("Base");
	});


	socket.on("device-highscores", data => {
	    device = "Highscorelist";
	    console.log("The Client is a Highscorelist");
	    socket.join("Highscores");
	    updateHighscores();
    });


*/




});


const pingInterval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping('', false, true);
    });
}, 30000);




server.listen(80, () => {
	console.log('listening on http://localhost:80');
});