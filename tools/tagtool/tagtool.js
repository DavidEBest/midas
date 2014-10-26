#! /usr/bin/env node

var fs = require('fs');
var pg = require('pg');

// load db config file
var config = require('../../config/local');

var args = process.argv.slice(2);
var tagType = args[0];
var tagFile = args[1];

var commandFormat = process.argv[0] + ' ' + process.argv[1] + ' tagType  /path/to/tag/file'; 

if (tagType.length === 0) {
  console.log('Tag type must be provided.');
  console.log(commandFormat);
  return 1;
}

var tags = [];
// load tags from file
if (fs.existsSync(tagFile)) {
  tags = fs.readFileSync(tagFile).toString().split("\n");
}
else {
  console.log('Failed to find tag file (' + tagFile + ')');
  console.log(commandFormat);
  return 1;
}

// open database
var client = new pg.Client({
  user: config.adapters.postgresql.user, 
  password: config.adapters.postgresql.password,
  database: config.adapters.postgresql.database,
  host: config.adapters.postgresql.host,
  port: 5432
});

client.on('drain', client.end.bind(client)); //disconnect client when all queries are finished

client.connect(function (err) {
  if (err) {
    console.log('Failed to connect to the database (' + err + ')');
    return 1;
  }
  // loop over records in the file, creating a record for each
  var date = new Date();
  for (i in tags) {
    if (tags[i].length > 0) {
      var insert = client.query({
          text: 'INSERT INTO tagEntity ("type","name","createdAt","updatedAt") SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT id FROM tagEntity WHERE "name" = $5 AND "type" = $6)',
          values: [tagType, tags[i], date, date, tags[i], tagType]
        }, function(err, result) {
          if (err) {
            console.log('Failed to add tag to the database: ' + tags[i] + ' with error '  + err);
            return 1;
          }
      });
    }
  }
});
