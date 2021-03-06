var express = require('express'),
      app = express(),
      http = require('http').Server(app),
      io = require('socket.io')(http);

var path = require('path')
    EventEmitter = require('events'),
    Twitter = require('twitter'),
    credentials = require('./credentials.js'),
    client = new Twitter(credentials),
    query = process.argv[2] || 'witcss',
    util = require('util'),
    port = process.env.PORT || 8080
    geocoder = require('geocoder');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(path.join(__dirname, 'public')));

http.listen(port, function() {
  console.log('listening on ' , port);
});

function TweetEmitter() {
  EventEmitter.call(this);
}

util.inherits(TweetEmitter, EventEmitter);

var tweetEmitter = new TweetEmitter();

tweetEmitter.on('tweet', function(tweet) {
  io.emit('tweet', tweet);
});

tweetEmitter.on('tweetList', function(list) {
  io.emit('tweetList', list);
});

var emitTweet = function(tweet, coordinates) {
 var tweetSmall = {
      id: tweet.id_str,
      user: tweet.user.screen_name,
      text: tweet.text,
      placeName: tweet.user.location,
      latLong: coordinates
    };
  tweetEmitter.emit('tweet', tweetSmall);
}

client.stream('statuses/filter', {track: query, language: 'en'}, function(stream) {
  stream.on('data', function(tweet) {
    if(tweet.user.location != null) {
      var coordinates = geocoder.geocode(tweet.user.location, function (err, data) {
        if (data.status !== 'ZERO_RESULTS'){
          emitTweet(tweet, [data.results[0].geometry.location.lng, data.results[0].geometry.location.lat]);
        }
      });
    } else {
      emitTweet(tweet, [ 26.3346979, -80.881233 ]) // antarctica
    }
  });
});

var searchQuery = {
  q: 'witcss',
  lang: 'en',
  result_type: 'mixed',
  count: 10
}

client.get('search/tweets', searchQuery, function(error, tweets, response) {
  var topTweets = tweets.statuses;
  tweetEmitter.emit('tweetList', topTweets);
});
