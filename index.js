const express = require("express");
const app= express();
const dotenv= require("dotenv");
const jwt= require("jsonwebtoken");
const {urlencoded} = require("body-parser");
const { default: mongoose } = require("mongoose");
const bodyParser = require("body-parser");
const Product= require("./models/product")
const Customer = require("./models/customer")
const Order= require("./models/order")
const unprotectedRoutes = ["/customer", "/product", "/login"];

dotenv.config();
const PORT= process.env.PORT || 3000;
const MONGO_URI= process.env.MONGO_URI;
const SECRET_KEY= process.env.SECRET_KEY;

app.use(bodyParser({urlencoded : {extended : false}}));
app.use(express.json());
app.set("views" , "./views");
app.set("view engine", "ejs");

mongoose.connect(MONGO_URI).then(()=>{
    console.log("connected to db")
}).catch((err)=>{
    console.log(err);
})

app.use((req, res, next)=>{
    if(unprotectedRoutes.includes(req.url)){
        next();
    }
    else{
        const token= req.headers.authorization;
        if(!token){
            return res.send("you are not logged in")
        }
        jwt.verify(token, SECRET_KEY, function(err, decoded){
            if(err){
                res.status(401).send("Authentication error" + err)
            }
            else{
                req.user = decoded.data;
                // console.log(req.user);
                next();
            }
        })
        
    }
})

app.post("/product", async (req, res)=>{
    try {
        const { product_id, product_type, product_name, product_price, available_quantity} = req.body;
        const product= await Product.create({
            product_id,
            product_type,
            product_name,
            product_price,
            available_quantity
        });
        res.status(200).send("Inventory Updated");
    } catch (error) {
        res.status(400).send("Error occured while updating inventory" + error);
    }
})

app.get("/product", (req, res)=>{
    Product.find({}, function(err, data){
        if(err){
            console.log(err);
        }
        else{
            res.render("product", {database : data})
        }
    })
})

app.post("/customer", async(req, res)=>{
    try {
        const {customer_id, customer_name, email, balance} = req.body;
        const customer= await Customer.findOne({email : email});
        if(customer){
            res.status(401).send("Email already Exists");
        }
        else{
            const customer= await Customer.create({
                customer_id,
                customer_name,
                email,
                balance
            })
            res.status(200).send("Customer added");
        }
    } catch (error) {
        res.status(400).send("Error occured while customer registeration" + error);
    }
    
})

app.get("/customer", (req, res)=>{
    Customer.find({}, function(err, data){
        if(err){
            console.log(err);
        }
        else{
            res.render("customer", {database : data})
        }
    })
})

app.post("/order",async (req, res)=>{
    try {
        const {product_name, quantity} = req.body;
        const customer= await Customer.findOne({email : req.user})
        const customer_id= customer.customer_id;
        const item= await Product.findOne({product_name : product_name});
        if(item){
            const product_id= item.product_id;
            if(quantity > item.available_quantity){
                res.status(200).send("OUT OF STOCK");
            }
            else{
                //if one can make order or not according to balance
                const totalamount= quantity * item.product_price;
                // console.log(totalamount);
                if(totalamount > customer.balance || customer.balance === 0){
                    return res.status(200).send("INSUFFICIENT FUNDS");
                }
                else{ //sufficient funds
                    const balanceleft= customer.balance - totalamount;
                     //change the funds in customer table
                    await Customer.findOneAndUpdate({customer_id : customer_id}, {balance : balanceleft})
                    //chnage available-quantity in products-table
                    const available= item.available_quantity - quantity;
                    // console.log(available);

                await Product.findOneAndUpdate({product_name : item.product_name}, {available_quantity : available})
                const order= await Order.create({
                    customer_id,
                    product_id,
                    product_name,
                    quantity
                });
                res.status(200).send("Order Placed Succefully")
                }
            }
        }
        else{
            res.status(200).send(`No product as ${product_name}`);
        }
    } catch (error) {
        res.status(400).send("Error occured while taking orders" + error);
    }
})

app.get("/order", async(req, res)=>{
    const customer= await Customer.findOne({email : req.user})
    Order.find({}, function(err, data){
        if(err){
            console.log(err);
        }
        else{
            res.render("order", {database : data})
        }
    })
})

app.post("/login",async (req, res)=>{
    try {
        const {email} = req.body;
        const customer= await Customer.findOne({email :email});
        if(!customer){
            res.status(401).send("Email not registered");
        }
        else{
            const token= jwt.sign({
                data: customer.email
            }, SECRET_KEY);
            // console.log(token);
            res.status(200).send(token);
        }
    } catch (error) {
        res.status(400).send("Error occured while logging in" + error);
    }
   
})

app.get("/", (req, res)=>{
    res.send("SERVER")
})

app.listen(PORT, console.log(`Server starting at ${PORT}`));