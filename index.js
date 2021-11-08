const express = require('express')
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors')
var admin = require("firebase-admin");


const app = express()
const port = process.env.PORT || 5000;

// firebase admin initialization

var serviceAccount = require("./ema-john-5921e-firebase-adminsdk-wyfjs-2eafb05b31.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// middlewere
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lw2c4.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next){
    if(req.headers?.authorization?.startsWith('Bearer ')){
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try{
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch{

        }
    }
    next();
}

async function run(){
    try{
        await client.connect();
        const database = client.db("online_shop");
        const productCollection = database.collection("products");
        const orderCollection = database.collection('orders')

        // get products API
        app.get('/products', async(req, res)=>{
            const cursor = productCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();
            if(page){
                products = await cursor.skip(page*size).limit(size).toArray();
            }
            else{
                products = await cursor.toArray();
            }
          
            res.send({
                count,
                products
            });
        });

        // use post to get data by keys
        app.post('/products/bykeys', async(req, res)=>{
            const keys = req.body;
            const query = {key : {$in: keys}}
            const products = await productCollection.find(query).toArray();
            res.json(products);
        });

        // Add order API
        app.get('/orders', verifyToken, async(req, res) =>{
            const email = req.query.email;
            if(req.decodedUserEmail === email){
                const query = {email :email};
                const cursor = orderCollection.find(query)
                const orders = await cursor.toArray();
                res.json(orders);

            }
            else{
                res.status(401).json({message : 'User not athorize'})
            }
            
        });


        app.post('/orders', async(req, res) =>{
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order)
            res.json(result)
        })
    }
    finally{
        // await client.close();
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log('Server running', port);
})