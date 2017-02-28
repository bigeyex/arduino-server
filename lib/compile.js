'use strict';
var uuid = require('node-uuid');
var spawn = require('child_process').spawn;
var Boom = require('boom');
var when = require('when');
var node = require('when/node');
var existsSync = require('fs').existsSync;
var fs = node.liftAll(require('fs'));
var crypto = require('crypto');


//if you put have arduino >1.5.2 (only tested on 1.6.1) you can run this on osx with osx=true npm start
var arduinoCmd = process.env.osx ? '/Applications/Arduino.app/Contents/MacOS/JavaApplicationStub' : '/usr/local/share/arduino/arduino';
var tmp = '/tmp/';
var name = 'blah';

var compile = function (request, reply) {

  var board = request.payload.board;
  var source = request.payload.source;

  var hash = crypto.createHash('md5').update(source).digest('hex'); 
  var path = tmp + hash;
  var buildPath = path + '/build/';
  var sketchPath = path + '/' + name + '/';
  var writePath = sketchPath + name + '.ino';
  var readPath = buildPath + name + '.cpp.hex';
  var logPath = buildPath + name + '.log';

  var makeDirPath = function(){
    return fs.mkdir(path);
  };

  var makeDirBuildPath = function(){
    return fs.mkdir(buildPath);
  };

  var makeDirSketchPath = function(){
    return fs.mkdir(sketchPath);
  };

  var write = function(){
    return fs.writeFile(writePath, source);
  };

  var arduinoProcess = function(){
    return when.promise(function(resolve, reject) {

      var returnObject = {
        log: new Buffer(0)
      };

      var options = {
        env: {
          DISPLAY: ':1.0'
        }
      };

      var arduinoCP = spawn(arduinoCmd, ['--board', board,
                                          '--pref', 'build.path=' + buildPath,
                                          '--verify', writePath],
                                          options);

      arduinoCP.stdout.on('data', function (data) {
        returnObject.log = Buffer.concat([returnObject.log, data]);
      });

      arduinoCP.stderr.on('data', function (data) {
        returnObject.log = Buffer.concat([returnObject.log, data]);
      });

      arduinoCP.on('close', function (code) {
        if( code === 1){
          return reject(Boom.create(400, 'Build failed', returnObject.log.toString()));
        }

        if( code > 0){
          return reject(Boom.create(500));
        }
        return resolve(returnObject);
      });
    });
  };


  var read = function(returnObject){
    return fs.readFile(readPath, 'utf8')
    .then(function(data){
      returnObject.hex = data;
      returnObject.log = returnObject.log.toString();
      return returnObject;
    });
  };

  var writeLog = function(returnObject) {
    return fs.writeFile(logPath, returnObject.log)
    .then(function(err) {
      return returnObject;
    });
  }

  var readLog = function(returnObject) {
    return fs.readFile(logPath, 'utf8')
    .then(function(data) {
      returnObject.log = data;
      console.log(returnObject);
      return returnObject;
    })
  }

  var emptyObject = function() {
    return when.promise(function(resole, reject) { return resolve({}) });
  }

  var cachedCompiling = function() {
      if(existsSync(path)) {
        return read({log: ''}).then(readLog);
      }
      else {
        return makeDirPath()
        .then(makeDirBuildPath)
        .then(makeDirSketchPath)
        .then(write)
        .then(arduinoProcess)
        .then(read)
        .then(writeLog);
      }
  }

  var promise = cachedCompiling();

  return reply(promise);
};

module.exports = compile;
