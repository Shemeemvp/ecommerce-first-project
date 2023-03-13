const collections = require("../config/collections");
var db = require("../config/connections");
var objectId = require("mongodb").ObjectId;
var fs = require("fs");

module.exports = {
  addProduct: (product, callback) => {
    db.get()
      .collection(collections.PRODUCT_COLLECTION)
      .insertOne(product)
      .then((data) => {
        callback(data.insertedId);
      });
  },

  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find()
        .toArray();
      resolve(products);
    });
  },

  deleteProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .deleteOne({ _id: new objectId(prodId) })
        .then((response) => {
          try {
            fs.unlinkSync("./public/product-images/" + prodId + ".jpg");
          } catch (err) {
            console.log(err);
          }
          resolve(response);
        });
    });
  },

  getProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .findOne({ _id: new objectId(prodId) })
        .then((product) => {
          resolve(product);
        });
    });
  },

  updateProduct: (prodId, productDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .updateOne(
          { _id: new objectId(prodId) },
          {
            $set: {
              Name: productDetails.Name,
              Description: productDetails.Description,
              Price: productDetails.Price,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },
};
