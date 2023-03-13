var express = require("express");
const productHelper = require("../helpers/product-helpers");
// const userHelpers = require("../helpers/user-helpers");
const userHelper = require("../helpers/user-helpers");
var router = express.Router();

const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

const isCart = async(req,res,next) =>{
  let cartCount = await userHelper.getCartCount(req.session.user._id);
  if (cartCount === 0) {
    res.render("user/empty-cart", { user:req.session.user });
  }else{
    next();
  }
}

/* GET home page. */
router.get("/", async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null;

  if (user) {
    cartCount = await userHelper.getCartCount(user._id);
  }

  productHelper.getAllProducts().then((products) => {
    res.render("user/products", { products, user, cartCount });
  });
});

router.get("/login", (req, res) => {
  if (req.session.user) {
    req.session.userLoggedIn = true;
    res.redirect("/");
  } else {
    res.render("user/login", { loginErr: req.session.userLoginErr });
    req.session.userLoginErr = false;
  }
});

router.get("/signup", (req, res) => {
  res.render("user/signup");
});

router.post("/signup", (req, res) => {
  userHelper.doSignup(req.body).then((response) => {
    
    req.session.user = response.user
    req.session.userLoggedIn=true

    res.redirect("/");
  });
});

router.post("/login", (req, res) => {
  userHelper.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user;
      req.session.userLoggedIn = true;
      
      res.redirect("/");
    } else {
      req.session.userLoginErr = "Invalid username or password";
      res.redirect("/login");
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.user = null;
  req.session.userLoggedIn = false
  res.redirect("/login");
});

router.get("/cart", verifyLogin,isCart, async (req, res) => {
  let user = req.session.user;
  let totalPrice = await userHelper.getTotalAmount(req.session.user._id)
  let cartCount = await userHelper.getCartCount(req.session.user._id);
  let cartProducts = await userHelper.getCartProducts(req.session.user._id);

  res.render("user/user-cart", { user, cartProducts, cartCount, totalPrice });
});

router.get("/add-to-cart/:id",verifyLogin, (req, res) => {
  userHelper.addToCart(req.params.id, req.session.user._id).then(() => {
    // res.redirect('/')
    res.json({ status: true });
  });
});

router.post("/change-product-quantity", (req, res, next) => {
  userHelper.changeProductQuantity(req.body).then(async(response) => {
    response.totalPrice= await userHelper.getTotalAmount(req.body.user)
    res.json(response);
  });
});

router.post('/cart/remove-item/', (req,res,next)=>{
  
  userHelper.removeItem(req.body).then((response)=>{
    res.json(response)
  })
})

router.get('/place-order',verifyLogin, async (req,res)=>{

  let totPrice= await userHelper.getTotalAmount(req.session.user._id)
  res.render('user/checkout', {user:req.session.user,totPrice})
})

router.post('/place-order', async (req,res)=>{

  let products= await userHelper.getCartProductList(req.body.userId)
  let totalPrice= await userHelper.getTotalAmount(req.body.userId)

  userHelper.placeOrder(req.body,products,totalPrice).then((orderId)=>{
    if(req.body.PaymentMethod === 'COD'){
      res.json({CODStatus: true})
      userHelper.clearCart(req.session.user._id)
    }else if(req.body.PaymentMethod === 'PAYPAL'){
      userHelper.generatePaypal(orderId,totalPrice).then((payment)=>{
        redirect_url = payment.href
        
        res.json({PAYPALStatus: true ,link: redirect_url, orderId})
        
      })
      
    }
    
  })
})

router.get('/paypal-success', async(req, res)=>{
  
  let totalPrice= await userHelper.getTotalAmount(req.session.user._id)
  userHelper.verifyPaypal(totalPrice,req.query).then(()=>{
    
    userHelper.clearCart(req.session.user._id)
    userHelper.changeOrderStatus(req.query.order)
   
    res.redirect('/order-placed')
  })
})

router.get('/paypal-cancel', (req,res)=>{
  // alert('Payment Failed')
  res.render('./payment-failed')
})

router.get('/order-placed', (req,res)=>{
  res.render('user/order-placed',{user:req.session.user})
})

router.get('/my-orders',verifyLogin, async(req,res)=>{
  let orders = await userHelper.getOrders(req.session.user._id)
  res.render('user/my-orders',{user:req.session.user,orders})
})

router.get('/view-order-item/:id', async(req,res)=>{
  let orderItems= await userHelper.getOrderItems(req.params.id)
  res.render('user/view-order-item',{user:req.session.user,orderItems})
})

module.exports = router;
