var http = require('http'),
    fs = require('fs'),
    url = require('url'),
    hash = require('password-hash'),
    port = 8080

const {Client} = require('pg');

// db server setup
const client = new Client({
    connectionString: process.env.DATABASE_URL || "pg://cs4241:8u4d6E&%q@localhost:5432/a3",
    //ssl: true
});

client.connect();

// server setup
var server = http.createServer(function (req, res) {
    var uri = url.parse(req.url);

    console.log('Pathname is: ' + uri.pathname);

    switch(uri.pathname) {
        case '/':
        case '/signup':
            send_file(res, 'public/html/signup.html');
            break;
        case '/create':
            create_account(req, res);
            break;
        case '/login':
            login(req, res);
            break;
        case '/add':
            addMessage(req, res);
            break;
        case '/update':
            updateMessage(req, res);
            break;
        case '/delete':
            deleteMessage(req, res);
            break;
        case '/message':
            send_message_content(req, res);
            break;
        case '/read':
            read(res);
            break;
        default:
            res.end('404 not found');
    }
})

server.listen(process.env.PORT || port)
console.log('listening on port 8080')

function send_file(res, filename) {
    fs.readFile(filename, function (error, content) {
        res.writeHead(200, {'Content-type': 'text/html'})
        res.end(content, 'utf-8')
    })
}

function new_id() {
    return Date.now().toString(36);
}

function create_account(req, res) {
    var info = [];
    var id = new_id();

    req.on('data', function(data) {
        info.push(JSON.parse(data));
    });

    req.on('end', function() {
        var hashedPassword = hash.generate(info[0].password);
        info[0].password = hashedPassword;

        var queryTemplate = `INSERT INTO "User" VALUES ('${id}', '${info[0].name}', '${info[0].password}');`;
        client.query(queryTemplate);
    });

    res.end(id);
}

function login(req, res) {
    var info = [];

    req.on('data', function(data) {
        info.push(JSON.parse(data));
    });

    req.on('end', function() {
        console.log("user is: " + info[0].user);
        console.log("password is: " + info[0].password);			

        var queryTemplate = `SELECT password FROM "User" WHERE id='${info[0].user}';`;
        client.query(queryTemplate, function(err, result) {
            if (err) {
                return console.error('error running query', err);
            }
            if (hash.verify(info[0].password, result.rows[0].password) === true) {
                console.log("password verified");
            }
        });

        res.end(info[0].user);
    });
}

function addMessage(req, res) {
    var info = [];

    req.on('data', function(data) {
        info.push(JSON.parse(data));
    });

    console.log("Adding message");

    req.on('end', function() {
        var messageID = new_id();
        var addPublic = `INSERT INTO "Message" VALUES ('${messageID}', '${info[0].user}', TRUE, '${info[0].content}');`;
        var addPrivate = `INSERT INTO "Message" VALUES ('${messageID}', '${info[0].user}', FALSE, '${info[0].content}');`;

        if (info[0].is_public) {
            console.log('Adding message PUBLIC')
            client.query(addPublic);
        } else {
            console.log('Adding message NOT PUBLIC')
            client.query(addPrivate);
        }
    });

    res.end('Added message');
}

function send_message_content(req, res) {
    var info = [];

    req.on('data', function(data) {
        info.push(JSON.parse(data));
    });

    req.on('end', function() {
        var queryTemplate = `SELECT * FROM "Message" WHERE id='${info[0].mes_id}';`;
        client.query(queryTemplate, function(err, result) {
            if (err) {
                return console.error('error running query', err);
            }

            console.log(JSON.stringify(result.rows));
            res.end(JSON.stringify(result.rows));
        });
    });
}

function updateMessage(req, res) {
    var info = [];

    req.on('data', function(data) {
        info.push(JSON.parse(data));
    });

    req.on('end', function() {
        var updateQuery =
            `UPDATE "Message"
            SET content = '${info[0].content}', is_public = ${info[0].is_public}
            WHERE id = '${info[0].id}';`;

        client.query(updateQuery);
    });

    res.end('updated message');
}


function deleteMessage(req, res) {
    var info = [];

    req.on('data', function(data) {
        info.push(JSON.parse(data));
    });

    req.on('end', function() {
        var deleteQuery =
            `DELETE FROM "Message" WHERE id = '${info[0].id}';`;

        client.query(deleteQuery);
    });

    res.end('deleted message');
}

function read(res) {
    var readQuery = `SELECT "Message".id, "Message".owner_id, "Message".is_public, "User".name, "Message".content FROM "Message", "User" WHERE "Message".owner_id="User".id;`;

    client.query(readQuery, function (err, result) {
        if (err) {
            return console.error('error running query', err);
        }

        res.writeHead(200, {'Content-type': 'application/json'});
        res.end(JSON.stringify(result.rows));
    });
}



