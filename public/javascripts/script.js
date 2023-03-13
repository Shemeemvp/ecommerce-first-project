function confirm_delete() {
  return confirm('Are you sure?');
}

function addToCart(prodId) {
  $.ajax({
    url: "/add-to-cart/" + prodId,
    method: "get",
    success: (response) => {
      if (response.status) {
        let count = $("#cart-count").html();
        count = parseInt(count) + 1;
        $("#cart-count").html(count);
      }
    },
  });
}

function changeQuantity(cartId, prodId,userId, count) {
  let quantity = parseInt(document.getElementById(prodId).innerHTML)
  count = parseInt(count)
  $.ajax({
    url: "/change-product-quantity",
    data: {
      cart: cartId,
      user: userId,
      product: prodId,
      count: count,
      quantity: quantity
    },
    method: "post",
    success: (response) => {
        
      if(response.removeProduct){
        alert("Item is removed from your cart.")
        location.reload()
      }else{
        document.getElementById(prodId).innerHTML= quantity+count
        document.getElementById('cart-total').innerHTML = response.totalPrice
      }
    },
  });
}

function removeItem(userId,prodId){
  $.ajax({
    url:'/cart/remove-item',
    data:{
      user: userId,
      product: prodId
    },
    method: 'post',
    beforeSend:function(){
      return confirm("Are you sure to remove this item from your cart?");
 },
    success:(response)=>{
      if(response){
        location.reload()
        
        // location.reload()
      }
    }
  })
}

$("#checkout-form").submit((e)=>{
  e.preventDefault()
  $.ajax({
    url:'/place-order',
    method: 'post',
    data: $("#checkout-form").serialize(),
    success: (response)=>{
      if(response.CODStatus){
        location.href='/order-placed'
      }else if(response.PAYPALStatus){
        location.href=response.link
        
      }
    }
  })
})