var events = require('events');
const path = require('path');
const notifier = require('node-notifier');
var spotify = require('spotify-node-applescript');
var request = require('request');

var isSpotifyRunning;
var initialState;
var isNotified = false;
var trackAlbum, trackAlbumArtist, trackName, artworkUrl, trackPopularity, trackID
var oldTrackName = '';

var eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(0);

eventEmitter.on(true, getState);
eventEmitter.on(false, getRunningStatus);
eventEmitter.on('state', detectStateChange);
eventEmitter.on('setTrack', setTrackDetails);

getRunningStatus(getState);

function getRunningStatus() {
    spotify.isRunning(function (err, isRunning) {
        if (isRunning) {
            console.log("spotify is running");
            eventEmitter.emit(true);
        } else {
            console.log("is running false");
            setTimeout(function () {
                eventEmitter.emit(false);
            }, 5000);
        }
        if (err) {
            console.log(err);
        }
    });
}

function getState() {
    spotify.getState(function (err, state) {
        //console.log("emit true: get state");
        if (state === null || state === undefined) {
            eventEmitter.emit(false);
        } else if (state.state == 'playing') {
            eventEmitter.emit('state');
        } else {
            isNotified = false;
            setTimeout(function () {
                eventEmitter.emit(true);
            }, 2000);
        }
        if (err) {
            console.log(err);
        }
    });
}

function detectStateChange() {
    //console.log("detect state change");
    getTrackDetails();
    notify();
    isNotified = true;
    eventEmitter.emit(true); // calls getState
}

function getTrackDetails() {
    spotify.getTrack(function (err, track) {
        if (track === null || track === undefined) {
            eventEmitter.emit(false, detectStateChange);
        } else {
            eventEmitter.emit('setTrack', track.album, track.album_artist,
                track.name, track.artwork_url, track.popularity, track.id);
            //console.log(" track ID   "+track.id);
        }
        if (err) {
            console.log(err);
        }
    });
}

function setTrackDetails(album, album_artist, name, artwork, popularity, track_id) {
    trackAlbum = album;
    trackAlbumArtist = album_artist;
    trackName = name;
    trackPopularity = popularity;
    trackID = track_id;
    // artworkUrl = artwork
}


function notify() {
    if ((!isNotified || oldTrackName != trackName) && trackName !== undefined) {
        getAlbumArt();
    }
}

function getAlbumArt() {
    var arr = trackID.split(":"); //Remove spotify:track form the id
    trackID = arr[2];
    //console.log("Track id 2: "+trackID);

    request('https://api.spotify.com/v1/tracks/' + trackID, function (error, response, body) {
        var body = JSON.parse(body);
        //console.log('error:', error); // Print the error if one occurred 
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
        console.log('Album art URL:', body.album.images[2].url);
        
        notifier.notify({
            title: trackName,
            subtitle: trackAlbum,
            contentImage: path.join(__dirname, '/img/spotify-logo.png'),
            icon: body.album.images[2].url,
            message: trackAlbumArtist + ' ~ Popularity: ' + trackPopularity,
            sender: 'com.spotify.client',
            group: 'com.spotify.client',
            actions: 'Skip'
        });
        oldTrackName = trackName;
    });
}
