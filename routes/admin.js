var express = require("express");
const { render } = require('../app')
var router = express.Router();
var productHelper= require('../helpers/product-helpers')
var adminHelper = require('../helpers/admin-helpers')

const verifyAdmin = (req, res, next)=>{
  if(req.session.adminLoggedIn){
    next()
  }else{
    res.redirect('/admin/admin-login')
  }
}

router.get('/admin-login', (req, res) => {
  if (req.session.admin) {
    req.session.adminLoggedIn = true;
    res.redirect("/");
  } else {
    res.render("admin/login", { loginErr: req.session.adminLoginErr });
    req.session.adminLoginErr = false;
  }
});

router.post("/adminlogin", (req, res) => {
  console.log(req.body);
  adminHelper.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin;
      req.session.adminLoggedIn = true;
      
      res.redirect("/admin");
    } else {
      req.session.adminLoginErr = "Invalid username or password";
      res.redirect("/admin/admin-login");
    }
  });
});

router.get('/logout', (req, res)=>{
  req.session.admin = false
  req.session.adminLoggedIn = false
  res.redirect('/admin/admin-login')
})

router.get("/",verifyAdmin, function (req, res, next) {
  productHelper.getAllProducts().then((products)=>{
    res.render('admin/view-products', { admin:req.session.admin ,products});
  })
});

router.get("/add-product", function (req, res, next) {
  res.render("admin/add-product", { admin:req.session.admin });
});

router.post('/add-product', (req,res)=>{

  productHelper.addProduct(req.body,(id)=>{
    let image=req.files.Image
    image.mv('./public/product-images/'+id+'.jpg',(err)=>{
      if(!err){
        res.render("admin/add-product",{admin:req.session.admin})
      }else{
        console.log(err);
      }
    })
    
  })
})

router.get('/delete-product/:id', (req,res)=>{
  let prodId= req.params.id
  productHelper.deleteProduct(prodId).then((response)=>{
    res.redirect('/admin/')
  })
})

router.get('/edit-product/:id', async(req,res)=>{
  let product =await productHelper.getProduct(req.params.id).then((product)=>{
    res.render('admin/edit-products',{product})
  })
})

router.post('/edit-product/:id', (req,res)=>{
  let id = req.params.id
  productHelper.updateProduct(req.params.id, req.body).then(()=>{
    if(req.files.Image){
      let image=req.files.Image
      
      image.mv('./public/product-images/'+id+'.jpg')
    }
    res.redirect('/admin/')
  })
})

router.get('/orders', verifyAdmin, (req,res)=>{
  adminHelper.getOrders().then((orders)=>{
    res.render('admin/view-orders',{admin: req.session.admin,orders})
  })
})

module.exports = router;
