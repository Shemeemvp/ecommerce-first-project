var db = require("../config/connections");
var collections = require("../config/collections");
const bcrypt = require("bcrypt");
const { ObjectId, ReturnDocument } = require("mongodb");
var objectId = require("mongodb").ObjectId;
var paypal = require('paypal-rest-sdk');

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      userData.Password = await bcrypt.hash(userData.Password, 10);
      db.get()
        .collection(collections.USER_COLLECTION)
        .insertOne(userData)
        .then(async () => {
          let user = await db
            .get()
            .collection(collections.USER_COLLECTION)
            .findOne({ Email: userData.Email });
          response.user = user;
          response.status = true;

          resolve(response);
        });
    });
  },

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};

      let user = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ Email: userData.Email });

      if (user) {
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            response.status = false;
            resolve(response);
          }
        });
      } else {
        response.status = false;

        resolve(response);
      }
    });
  },

  addToCart: (prodId, userId) => {
    let proObj = {
      item: new objectId(prodId),
      quantity: 1,
    };

    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: new objectId(userId) });

      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == prodId
        );
        if (proExist != -1) {
          db.get()
            .collection(collections.CART_COLLECTION)
            .updateOne(
              {
                user: new ObjectId(userId),
                "products.item": new objectId(prodId),
              },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collections.CART_COLLECTION)
            .updateOne(
              { user: new ObjectId(userId) },
              {
                $push: {
                  products: proObj,
                },
              }
            )
            .then(() => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: new objectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collections.CART_COLLECTION)
          .insertOne(cartObj)
          .then(() => {
            resolve();
          });
      }
    });
  },

  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          {
            $match: {
              user: new ObjectId(userId),
            },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      resolve(cartItems);
    });
  },

  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: new objectId(userId) });

      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    });
  },

  changeProductQuantity: (details) => {
    count = parseInt(details.count);
    quantity = parseInt(details.quantity);

    return new Promise((resolve, reject) => {
      if (count == -1 && quantity == 1) {
        db.get()
          .collection(collections.CART_COLLECTION)
          .updateOne(
            { _id: new objectId(details.cart) },
            {
              $pull: { products: { item: new objectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        db.get()
          .collection(collections.CART_COLLECTION)
          .updateOne(
            {
              _id: new objectId(details.cart),
              "products.item": new objectId(details.product),
            },
            {
              $inc: { "products.$.quantity": count },
            }
          )
          .then(() => {
            resolve({ status: true });
          });
      }
    });
  },

  removeItem: (details) => {
    console.log(details.user, details.product);
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CART_COLLECTION)
        .updateOne(
          { _id: new objectId(details.user) },
          {
            $pull: {
              products: { item: new objectId(details.product) },
            },
          }
        )
        .then((response) => {
          resolve(true);
        });
    });
  },

  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartTotal = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          {
            $match: {
              user: new ObjectId(userId),
            },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", { $toInt: "$product.Price" }],
                },
              },
            },
          },
        ])
        .toArray();
      if (cartTotal.length !== 0) {
        resolve(cartTotal[0].total);
      } else {
        resolve(true);
      }
    });
  },

  placeOrder: (order, products, totalPrice) => {
    return new Promise((resolve, reject) => {
      let status = order.PaymentMethod === "COD" ? "Placed" : "Pending";
      let orderObj = {
        userId: order.userId,
        delivery: {
          name: order.Name,
          mobile: order.Mobile,
          address1: order.AddressLine1,
          address2: order.AddressLine2,
          city: order.City,
          state: order.State,
          pin: order.Pincode,
        },
        products: products,
        amount: totalPrice,
        orderedDate: new Date(),
        payment: order.PaymentMethod,
        orderStatus: status,
      };

      db.get()
        .collection(collections.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          // db.get()
          //   .collection(collections.CART_COLLECTION)
          //   .deleteOne({ user: new objectId(order.userId) });
          resolve(response.insertedId);
        });
    });
  },

  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: new objectId(userId) });
      resolve(cart.products);
    });
  },

  getOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .find({ userId: userId })
        .toArray();
      resolve(orders);
    });
  },

  getOrderItems: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderItems = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              _id: new objectId(orderId),
            },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      resolve(orderItems);
    });
  },

  generatePaypal: (orderId,amount)=>{

    paypal.configure({
      'mode': 'sandbox', //sandbox or live
      'client_id': 'AVobd2x_pqZzFLxoQ8KnvysSSFtIeSigLhCBP8kPs-z0ZyoAcqO13BMTzu5nNrSsNQwwEiKIbIuMcnSp',
      'client_secret': 'EL6qfWfbnA9g6qi0n7BK4uAzxIdTCC9xwdIju96AUGyQrPO37O-4zNr_-c22rJeqIZ9Nhx2npYTuK9Zw'
    });

    var create_payment_json = {
      "intent": "sale",
      "payer": {
          "payment_method": "paypal"
      },
      "redirect_urls": {
          "return_url": "http://localhost:3000/paypal-success?order="+orderId,
          "cancel_url": "http://localhost:3000/paypal-cancel"
      },
      "transactions": [{
          // "item_list": {
          //     "items": [{
          //         "name": "item",
          //         "sku": "item",
          //         "price": amount,
          //         "currency": "INR",
          //         "quantity": 1
          //     }]
          // },
          "amount": {
              "currency": "USD",
              "total": amount
          },
          "description": "This is the payment description."
      }]
  };


    return new Promise((resolve, reject)=>{

    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
          console.log('error occurred');
            throw error;
        } else {
            console.log("Create Payment Response");
            payment = payment.links.filter((data) => data.rel === 'approval_url')[0]
            redirect_url = payment.href
            resolve(payment)
          }
    });
    
    })
  
  },

  verifyPaypal: (amount,paypalDetails)=>{
    console.log(amount);

    var execute_payment_json = {
      "payer_id": paypalDetails.PayerID,
      "transactions": [{
          "amount": {
              "currency": "USD",
              "total": amount
          }
      }]
  };
  
  var paymentId = paypalDetails.paymentId;
    return new Promise((resolve,reject)=>{
      
    
    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            console.log("Get Payment Response");
            console.log(JSON.stringify(payment));
        }
    });
    resolve()
    })
  },

  clearCart: (userId)=>{
    return new Promise((resolve, reject)=>{
      db.get().collection(collections.CART_COLLECTION).deleteOne({user: new objectId (userId)})
    })
  },

  changeOrderStatus: (orderId)=>{
    
    return new Promise((resolve, reject)=>{
      db.get().collection(collections.ORDER_COLLECTION)
      .updateOne({_id: new objectId(orderId)},
      {
        $set:{
          orderStatus: 'Placed'
        }
      }
      )
      resolve()
    })
  }

};
