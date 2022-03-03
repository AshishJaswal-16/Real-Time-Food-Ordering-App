require("dotenv").config();
const express = require("express");
const app = express();
const ejs = require("ejs");
const path = require("path");
const PORT = process.env.PORT || 3030;
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("express-flash");
const MongoDbStore = require("connect-mongo");
const passport = require('passport');
const Emitter = require('events');

//Database connection
const url = process.env.MONGO_CONNECTION_URL;
// mongoose.connect(url, {
// 	useNewUrlParser: true,
// 	useCreateIndex: true,
// 	useUnifiedTopology: true,
// 	useFindAndModify: true,
// })
// const connection = mongoose.connection;
// connection.once('open', ()=> {
// 	console.log('Database connected...');
// }).catch(err => {
// 	console.log('Connection failed...');
// });
(async () => {
	try {
		await mongoose.connect(url, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log("Connected to DB successfully");
	} catch (err) {
		console.log("error: " + err);
	}
})();
 
//Session store
let mongoStore = new MongoDbStore({
	mongoUrl: url,
	mongooseConnection: mongoose.connection,
	collection: "sessions",
});

// Event emitter
const eventEmitter = new Emitter();
app.set('eventEmitter', eventEmitter);

//Session config- works as a middleware...session require cookies
app.use(
	session({
		secret: process.env.COOKIE_SECRET,
		resave: false,
		store: mongoStore,
		saveUninitialized: false,
		cookie: { maxAge: 1000 * 60 * 60 * 24 }, //24 hours
	})
);

//Passport config
const passportInit = require('./app/config/passport');
passportInit(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

//Assets
// the following code is to serve images, CSS files, and JavaScript files in a directory named public
app.use(express.static("public"));
app.use(express.urlencoded({extended:false}));
app.use(express.json());

//Global middleware
app.use((req,res, next) => {
	res.locals.session = req.session;
	res.locals.user = req.user;
	next()
})

//set template engine
app.set("views", path.join(__dirname, "/resources/views"));
app.set("view engine", "ejs");

require("./routes/web")(app);
app.use((req, res) => {
	res.status(404).render('errors/404');
})

const server = app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});

//Socket
const io = require('socket.io')(server)
io.on('connection', (socket) => {
      // Join
      socket.on('join', (orderId) => {
        socket.join(orderId)
      })
})

eventEmitter.on('orderUpdated', (data) => {
    io.to(`order_${data.id}`).emit('orderUpdated', data)
})


eventEmitter.on('orderPlaced', (data) => {
    io.to('adminRoom').emit('orderPlaced', data)
})