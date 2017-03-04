var io = require('socket.io-client')
  , io_server = require('socket.io').listen(3000);
var chai = require('chai');

var expect = chai.expect;

describe('socket.io tests', function() {

  var socket;

  beforeEach(function(done) {
    // Setup
    socket = io.connect('http://localhost:3000', {
      'reconnection delay' : 0
      , 'reopen delay' : 0
      , 'force new connection' : true
      , transports: ['websocket']
    });

    socket.on('connect', () => {
      done();
    });

    socket.on('disconnect', () => {
      console.log('disconnected...');
    });
  });

  afterEach((done) => {
    // Cleanup
    if(socket.connected) {
      socket.disconnect();
    }
    io_server.close();
    done();
  });

  it('should communicate', (done) => {
   
    io_server.emit('send:message',  {
      user: 'username',
      text: 'message'
    });

    socket.once('send:message', (data) => {
      
      expect(data.user).to.equal('username');
      expect(data.text).to.equal('message');
      done();
    });

    io_server.on('connection', (socket) => {
      expect(socket).to.not.be.null;
    });
  });

});