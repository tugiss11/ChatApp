'use strict';

var React = require('react');

var socket = io.connect();

var typingLength = 800;
var lastTypingTime;
var typing = false;

var UsersList = React.createClass({
	render() {
		return (
			<div className='users'>
				<h4> Users:</h4>
				<ul>
					{
						this.props.users.map((user, i) => {
							return (
								<li key={i}>
									{user} 								
								</li>
							);
						})
					}
				</ul>				
			</div>
		);
	}
});


var ChannelList = React.createClass({

	onClick(channel) {
		console.log('Clicked ' + channel);
		console.log('Currently in ' + this.props.currentChannel);
		if (channel !== this.props.currentChannel){
		this.props.onChannelClicked(channel);
		}	
	},

	render() {
		return (
			<div className='channels'>
				<ul className='horizontal-list'>
					{
						this.props.channels.map((channel, i) => {
							return (
								<li className='floating' key={i}>
									<a onClick={() => this.onClick(channel)} style={{cursor: 'pointer'}}>							
									{channel} 
									</a>
								</li>
							);
						})
					}
				</ul>				
			</div>
		);
	}
});



var Message = React.createClass({
	render() {
		return (
			<div className="message">
				<strong> {this.props.user}</strong> 
				<span>{this.props.text}</span>		
			</div>
		);
	}
});

var MessageList = React.createClass({
	scrollToBottom() {
		var node = this.getDOMNode();
		const scrollHeight = node.scrollHeight;
		const height = node.clientHeight;	
		const maxScrollTop = scrollHeight - height;
		node.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
	},

	componentDidUpdate() {
		this.scrollToBottom();
	},
	render() {
		return (
			<div className='messages'>
				{
					this.props.messages.map((message, i) => {
						return (
							<Message
								key={i}
								user={message.user}
								text={message.text} 
							/>
						);
					})
				} 
			</div>
		);
	}
});

var MessageForm = React.createClass({

	getInitialState() {
		return {text: ''};
	},

	getFormattedTimestamp(){
    var date = new Date();
    var hours = date.getHours();
    hours = (hours < 10 ? "0" : "") + hours;
    var minutes = date.getMinutes();
    minutes = (minutes < 10 ? "0" : "") + minutes;
    var seconds = date.getSeconds();
    seconds = (seconds < 10 ? "0" : "") + seconds;
    var timestamp =  hours + ":" + minutes + ":" + seconds; 
    return timestamp;
  },

	handleSubmit(e) {
		e.preventDefault();
		if (this.state.text){
			var message = {
				user : this.getFormattedTimestamp() + " <"+ this.props.user+"> ",
				text : this.state.text
			}
			this.props.onMessageSubmit(message);	
			this.setState({ text: '' });
		}
	},

	changeHandler(e) {
		if (e.target.value){
			this.props.onUpdateTyping();
		}
		this.setState({ text : e.target.value });
	},

	render() {
		return(
			<div className='message_form'>
				<form onSubmit={this.handleSubmit}>
					<input className='messageInput'
						onChange={this.changeHandler}
						value={this.state.text}
						placeholder='Type here..'
					/>
				</form>
			</div>
		);
	}
});

var ChangeNameForm = React.createClass({
	getInitialState() {
		return {newName: '', showChat: false};
	},

	onKey(e) {
		this.setState({ newName : e.target.value });
	},

	handleSubmit(e) {
		e.preventDefault();
		var newName = this.state.newName;
		this.props.onChangeName(newName);	
		this.setState({ newName: '' });
		
	},

	render() {
		return(
			<div className='change_name_form'>
				<h3> Hello, what's your name? </h3>
				<form onSubmit={this.handleSubmit}>
					<input
						onChange={this.onKey}
						value={this.state.newName} 
					/>
				</form>	
			</div>
		);
	}
});

var ChatApp = React.createClass({

	getInitialState() {
		return {
			users: [], 
			messages:[], 
			text: '', 
			channel: '', 
			showChat: false, 
			channels:[],
			typingLength: 500
		};
	},

	componentDidMount() {
		socket.on('init', this._initialize);
		socket.on('send:message', this._messageRecieve);
		socket.on('remove:message', this._messageRemove);
		socket.on('user:join', this._userJoined);
		socket.on('user:left', this._userLeft);
		socket.on('update:users', this._updateUsers);
		socket.on('change:name', this._userChangedName);
	},

	_initialize(data) {
		var {users, name, channels, channel} = data;
		var {messages} = this.state;
		messages.push({
			user: '',
			text: 'You are now talking in ' + channel + '. Type /help for instructions'
		});
		this.setState({users, user: name, channels, channel, messages});
		console.log(users);
	},

	handleUpdateTyping () {
		var {user} = this.state;
		var {channel} = this.state;
		if (!typing) {
			typing = true;
			socket.emit('typing', { name : user, channel : channel});
			this.setState({typing});
		}
		lastTypingTime = (new Date()).getTime();
		
		setTimeout(function () {
			var typingTimer = (new Date()).getTime();
			var timeDiff = typingTimer - lastTypingTime;
			if (timeDiff >= typingLength && typing) {
				socket.emit('stop:typing', { name : user, channel : channel});
				typing = false;
			}
		}, typingLength);
		
		
	},

	_messageRecieve(message) {
		var {messages} = this.state;
		messages.push(message);
		this.setState({messages});
	},

	_messageRemove(message) {
		var {messages} = this.state;
		var index = messages.findIndex(m => m.user == message.user && m.message == message.message);
		if (index > -1){
			messages.splice(index, 1);
			this.setState({messages});
		}
	},

	_userJoined(data) {
		var {users, messages} = this.state;
		var {name} = data;
		users.push(name);
		messages.push({
			user: '',
			text : name +' has connected'
		});
		this.setState({users, messages});
	},

	_userLeft(data) {
		var {users, messages} = this.state;
		var {name} = data;
		var index = users.indexOf(name);
		users.splice(index, 1);
		messages.push({
			user: '',
			text : name +' has disconnected'
		});
		this.setState({users, messages});
	},


	_updateUsers(data) {
		console.log(data);
		var {users} = data;
		this.setState({users});
	},

	_userChangedName(data) {
		var {oldName, newName} = data;
		var {users, messages} = this.state;
		var index = users.indexOf(oldName);
		users.splice(index, 1, newName);
		messages.push({
			user: ' ',
			text :  oldName + ' is now known as '+ newName
		});
		this.setState({users, messages});
	},

	handleHelp(){
		var {user} = this.state;
		socket.emit('help', user);
	},

	handleMessageSubmit(message) {
		if (message.text === '/help'){
			this.handleHelp();
		} else {
			var {messages, user, channel} = this.state;
			messages.push(message);
			this.setState({messages});
			socket.emit('stop:typing', { name : user, channel : channel});
			typing = false;
			socket.emit('send:message', message);
		}
	},

	onChannelClicked(newChannel) {
		console.log(newChannel);
		var {channel, messages} = this.state;
		channel = newChannel;
		messages = [];
		messages.push({
			user: '',
			text: 'You are now talking in ' + newChannel
		});
		console.log(messages);
		this.setState({messages, channel});
		socket.emit('switchRoom', newChannel);
	},

	handleChangeName(newName) {
		var oldName = this.state.user;
		socket.emit('change:name', { name : newName}, (result) => {
			if(!result) {
				return alert('There was an error changing your name');
			}
			var {users} = this.state;
			var index = users.indexOf(oldName);
			users.splice(index, 1, newName);
			this.setState({users, user: newName, showChat : true});
		});
	},
	
	render() {
		return (
			<div> { this.state.showChat ?
				 <UsersList
					users={this.state.users} 
				/> : null}
				{ this.state.showChat ?
				 <ChannelList
					channels={this.state.channels}
					currentChannel={this.state.channel}
					onChannelClicked={this.onChannelClicked} 
				/> : null}
				{ this.state.showChat ?<MessageList
					messages={this.state.messages}
				/> : null}
				{ this.state.showChat ? <MessageForm
					onMessageSubmit={this.handleMessageSubmit}
					onUpdateTyping={this.handleUpdateTyping}
					user={this.state.user}
				/> : null} { this.state.showChat ? null :
				<ChangeNameForm
					onChangeName={this.handleChangeName}
				/> }
			
			</div>
		);
	}
});
	


React.render(<ChatApp/>, document.getElementById('app'));