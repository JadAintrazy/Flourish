const express = require('express');
const app = express();

const path = require('path');

app.set("view engine", "ejs");

const bcrypt = require('bcrypt'); //ecryption to hash password 

app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "style")));
app.set("style", path.join(__dirname, "style"));
app.use(express.static(path.join(__dirname, "images")));

var fs = require('fs');

app.use('/slick', express.static("slick"));

const mongoose = require('mongoose');

app.use(express.urlencoded({ extended: false }));
//new pwd: wHNl4YtpfOeG47cD
// mongodb+srv://admin:<password>@cluster0.gd9mqyg.mongodb.net/?retryWrites=true&w=majority
mongoose.connect('mongodb+srv://admin:WKORoGXOdMMpYr27@flourish.zty9d9q.mongodb.net/?retryWrites=true&w=majority');
//username: admin password: gX2EOZm9SOOaL6HL
//mongodb+srv://admin:<password>@flourish.vzqucu4.mongodb.net/?retryWrites=true&w=majority 

// username: admin password: WKORoGXOdMMpYr27


var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const users = require("./users")
const products = require("./products")

const multer = require('multer'); //requiring multer

const Storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'images'); //destination to store uploads in
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.fieldname); //name of file will be date+name
    }
});

const upload = multer({
    storage: Storage
})

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
});

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
        mongooseConnection: db
    })
}));


app.get('/news', (req, res) => {
    res.render('news');
})

app.get('/form', (req, res) => {
    res.render('form');
})

app.get('/previewItem', (req, res) => {
    res.render('previewItem');
})


app.get('/addItem', (req, res) => {
    res.render('addItem');
})


var ext = "image/";
app.post('/insert', upload.single('image'), (req, res, next) => {
    console.log(req.file);
    findExt(req.file.originalname, req.file.originalname.length - 1);

    //function to know individual extensions of each picture uploaded
    function findExt(origName, index) {
        if (origName[index] == '.')
            return;
        findExt(origName, index - 1);
        ext += origName[index];
    }

    var record = {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        image: {
            data: fs.readFileSync(path.join(__dirname + '/images/' + req.file.filename)),
            contentType: ext,
        }
    }

    products.create(record, (err, item) => {
        if (err) {
            console.log(err);
        }
        else {
            res.redirect('/addItem');
        }
    });

})


var id;
app.get('/previewItem/:_id', async (req, res) => {
    // console.log("reached");
    id = req.params._id.slice(1, req.params._id.length);
    res.redirect('/preview');
})

app.get('/preview', async (req, res) => {
    const prod = await products.findById(id);
    res.render('previewItem', { prod: prod });
})

var cart = [];
var prodId;
app.post("/addToCart/:id", async(req,res)=>{
    prodId = req.params.id;
    for(var i = 0; i < cart.length; i++) {
        if(prodId == cart[i]._id) {
            cart[i].quantity += 1;
            res.redirect('/cart');
        }
    }
    //else if not already found in cart
    const productToFind = await products.findById(prodId);
    productToFind.quantity = productToFind.quantity + 1;
    cart.push(productToFind);
    res.redirect('/cart');
})

app.post('/add/:_id/:quantity', async(req,res) =>{
    console.log("reached add")
    prodId = req.params._id;
    for(var i = 0; i < cart.length; i++) {
        if(prodId == cart[i]._id) {
            cart[i].quantity += req.params.quantity;
            res.redirect('/cart');
        }
    }
    //if not found
    const productToFind = await products.findById(prodId);
    productToFind.quantity = req.params.quantity;
    console.log(productToFind.quantity);
    cart.push(productToFind);
    res.redirect('/cart');
})

app.get('/cart', (req, res) => {
    res.render('cart', {Cart:cart});
})

app.post('/checkout', (req,res)=> {
    delete cart;
    cart = [];
    res.redirect('/cart');
})

app.post('/register', async (req, res) => {
    console.log(req.body);
    var personInfo = req.body;

    var hashedPassword;
    //hashing below
    try {
        hashedPassword = await bcrypt.hash(req.body.pass, 10);
        console.log(hashedPassword);

    } catch {
        console.log(err);
    }

    if (!personInfo.registrationEmail || !personInfo.name || !personInfo.pass || !personInfo.confirmPass) {
        console.log("!personInfo");
        res.send();
    }
    else {
        console.log("else")
        if (personInfo.pass === personInfo.confirmPass) {

            users.findOne({ email: personInfo.registrationEmail }, function (err, data) {
                if (!data) {
                    var c;
                    users.findOne({}, async function (err, data) {

                        if (data) {
                            c = data.id + 1;
                        } else {
                            c = 1;
                        }


                        try {

                            const newPerson = await users.create({

                                id: c,
                                name: personInfo.name,
                                email: personInfo.registrationEmail,
                                password: hashedPassword,
                            });

                            console.log(newPerson)
                        }
                        catch {
                            console.log("Can't create")
                        }


                    }).sort({ _id: -1 }).limit(1);

                    res.send({ "Success": "You are registered. You can login now!" });

                }
                else {
                    res.send({ "Success": "Email already in use." });
                }
            });
        }
        else {
            console.log("pass not matched")
            res.send({ "Success": "Password is not matched." });
        }
    }
});



app.post('/login', (req, res) => {

    users.findOne({ email: req.body.email }, function (err, data) {
        if (data) {
            bcrypt.compare(req.body.password, data.password, function (err, result) {
                if (result === true) {
                    console.log("Done Login");
                    req.session.id = data.id;
                    req.session.loggedIn = true;
                    req.session.isAdmin = data.admin;

                    res.send({ "Success": "Success!" });
                }
                else {
                    res.send({ "Success": "Wrong password!" }); 
                }
            });
        }

        else {
            res.send({ "Success": "This email is not registered!" });
        }
    });

})

app.get('/', (req, res) => {

    if(!req.session.loggedIn) {
        req.session.loggedIn = false;
    }

    if(!req.session.isAdmin) {
        req.session.isAdmin = false;
    }

    // console.log("loggedIn " + req.session.loggedIn)
    // console.log("isAdmin " + req.session.isAdmin)

    res.render('home', {loggedIn: req.session.loggedIn, isAdmin: req.session.isAdmin});

})

app.get('/shop', async (req, res) => {
    
    if(!req.session.isAdmin) {
        req.session.isAdmin = false;
    }

    const prods = await products.find({});

    res.render('shop', { products: prods , loggedIn: req.session.loggedIn, isAdmin: req.session.isAdmin });
})

app.get('/logout', function (req, res, next) {
	console.log("logout")
    delete cart;
    cart = [];
	if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
    	if (err) {
    		return next(err);
    	} else {
    		return res.redirect('/');
    	}
    });
}
});

app.listen(5000);