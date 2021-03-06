var crypto = require('crypto'),
    Feed = require('feed'),
    fs = require("fs-extra"),
    path = require("path"),
    twitter2RssShared = require("./twitter2rss-shared"),
    _ = require("underscore"),
    argv = require('yargs').argv;

const
    APPLICATION = {
        LOCAL: "im.dico.twitter2rss",
        NAME: "twitter2rss",
        VERSION: "0.2.0"
    };

let data = "";

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk) { data += chunk; });

process.stdin.on('end', function() {

    // converts the pipe into a JavaScript array of tweets
    let tweets = data.split("\n").reduce((memo, line) => {
        try {
            return memo.concat(JSON.parse(line));
        } catch (e) {
            return memo;
        }
    }, [ ]);

    // restore the dates
    tweets.forEach(s => s.created_at = new Date(s.created_at));

    let configuration = twitter2RssShared.readConfiguration(argv);

    tweets = twitter2RssShared.allFilters(
        tweets,
        {
            "drops": configuration.drops,
            "retweets": configuration.retweets,
            "replies": configuration.replies,
            "noise": configuration.noise,
            "languages": configuration.languages
        }
    );

    // create the feed
    let
        // make a random feed name if no configuration file is specified
        feedName = argv._.length > 0 ? path.basename(argv._[0], ".json") : crypto.randomBytes(4).toString('hex'),
        feed = new Feed({
            // the id must be an URL otherwise the feed is not valid Atom, however
            // this is not a valid URL of course
            "id": "https://github.com/Digital-Contraptions-Imaginarium/twitter2rss/" + feedName,
            "title": "twitter2rss_" + feedName,
            "link": 'https://github.com/Digital-Contraptions-Imaginarium/twitter2rss',
            "updated": Math.max.apply(Math, tweets.map(t => t.created_at))
        });
    tweets.forEach(function (tweet) {
        feed.addItem({
            // the id must be an URL otherwise the feed is not valid Atom
            "id": "https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str,
            "author": [ {
                        "name": tweet.user.name + " (@" + tweet.user.screen_name + ")",
                        "link": 'https://twitter/' + tweet.user.screen_name
                    } ],
            "title": tweet.text.split("\n")[0],
            "description": tweet.text,
            "date": tweet.created_at,
            "link": "https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str + "?theme=" + encodeURIComponent(feedName)
        });
    });
    console.log(feed.render('atom-1.0'));
    process.exit(0);
});
