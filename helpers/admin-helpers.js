var db = require("../config/connections");
var collections = require("../config/collections");
const bcrypt = require("bcrypt");
var objectId = require("mongodb").ObjectId;
var paypal = require("paypal-rest-sdk");

module.exports = {
  doLogin: (data) => {
    return new Promise(async (resolve, reject) => {
      //   let loginStatus = false;
      let response = {};

      let admin = await db
        .get()
        .collection(collections.ADMIN)
        .findOne({ Email: data.Email });

      if (admin) {
        bcrypt.compare(data.Password, admin.Password).then((status) => {
          if (status) {
            response.admin = admin;
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

  getOrders: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .find({ orderStatus: "Placed" })
        .toArray();
      resolve(orders);
    });
  },



};
