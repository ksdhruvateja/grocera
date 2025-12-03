const Stripe = require('stripe');
const User = require('../models/User');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Initialize Stripe with secret key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Production-ready Stripe Payment Controller
class StripeController {
  
  // Create Payment Intent for checkout
  static async createPaymentIntent(req, res) {
    try {
      const { cartItems, shippingAddress, billingAddress, savePaymentMethod = false } = req.body;
      const user = req.user;

      // Validate cart items
      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty',
          code: 'EMPTY_CART'
        });
      }

      // Verify products and calculate total
      let calculatedTotal = 0;
      const verifiedItems = [];

      for (const item of cartItems) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${item.productId}`,
            code: 'PRODUCT_NOT_FOUND'
          });
        }

        if (!product.inStock || product.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}`,
            code: 'INSUFFICIENT_STOCK',
            product: product.name,
            available: product.stockQuantity
          });
        }

        const itemTotal = product.price * item.quantity;
        calculatedTotal += itemTotal;

        verifiedItems.push({
          productId: product._id,
          productName: product.name,
          productImage: product.image,
          price: product.price,
          quantity: item.quantity,
          subtotal: itemTotal,
          productSku: product.sku,
          productCategory: product.category
        });
      }

      // Calculate tax (NY state tax 8.875%)
      const taxRate = 0.08875;
      const taxAmount = Math.round(calculatedTotal * taxRate);

      // Calculate shipping (example: free over $50, otherwise $5.99)
      const shippingAmount = calculatedTotal >= 50 ? 0 : 599; // in cents

      const totalAmount = calculatedTotal + taxAmount + shippingAmount;

      // Ensure user has Stripe customer ID
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        stripeCustomerId = await user.createStripeCustomer(stripe);
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        customer: stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: user._id.toString(),
          userEmail: user.email,
          orderType: 'grocery_purchase',
          environment: process.env.NODE_ENV,
          itemCount: cartItems.length
        },
        shipping: shippingAddress ? {
          name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          phone: shippingAddress.phone,
          address: {
            line1: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            postal_code: shippingAddress.zipCode,
            country: shippingAddress.country || 'US'
          }
        } : undefined,
        setup_future_usage: savePaymentMethod ? 'on_session' : undefined
      });

      // Create pending order
      const order = new Order({
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        user: user._id,
        userId: user._id,
        items: verifiedItems,
        subtotal: calculatedTotal,
        taxAmount,
        shippingAmount,
        totalAmount,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        stripePaymentIntentId: paymentIntent.id,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        orderSource: 'web',
        customerType: user.sessionCount > 1 ? 'returning' : 'new'
      });

      await order.save();

      // Reserve stock temporarily (optional - implement inventory management)
      // for (const item of verifiedItems) {
      //   await Product.findByIdAndUpdate(item.productId, {
      //     $inc: { reservedStock: item.quantity }
      //   });
      // }

      console.log(`💳 Payment intent created: ${paymentIntent.id} for user: ${user.email}`);

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          orderId: order._id,
          amount: totalAmount,
          currency: 'usd',
          breakdown: {
            subtotal: calculatedTotal,
            tax: taxAmount,
            shipping: shippingAmount,
            total: totalAmount
          }
        }
      });

    } catch (error) {
      console.error('Create payment intent error:', error);

      // Handle Stripe errors
      if (error.type === 'StripeCardError') {
        return res.status(400).json({
          success: false,
          message: 'Your card was declined.',
          code: 'CARD_DECLINED',
          stripeError: error.message
        });
      }

      if (error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment request.',
          code: 'INVALID_REQUEST',
          stripeError: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during payment processing.'
      });
    }
  }

  // Confirm Payment and Complete Order
  static async confirmPayment(req, res) {
    try {
      const { paymentIntentId, orderId } = req.body;
      const user = req.user;

      // Find the order
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        });
      }

      // Verify order belongs to user
      if (order.userId.toString() !== user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to order',
          code: 'UNAUTHORIZED_ORDER'
        });
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Update order status
        order.status = 'confirmed';
        order.paymentStatus = 'paid';
        order.stripePaymentIntentId = paymentIntentId;
        
        // Calculate delivery date
        order.calculateEstimatedDelivery();
        
        // Add status history
        order.statusHistory.push({
          status: 'confirmed',
          timestamp: new Date(),
          note: 'Payment successful'
        });

        await order.save();

        // Update product stock
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { 
              stockQuantity: -item.quantity,
              soldCount: item.quantity
            }
          });
        }

        // Clear user's cart
        await Cart.findOneAndUpdate(
          { userId: user._id },
          { $set: { items: [] } }
        );

        // Save payment method if requested
        if (paymentIntent.payment_method && paymentIntent.setup_future_usage) {
          try {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
            
            // Add to user's saved payment methods
            if (paymentMethod.card) {
              user.paymentMethods.push({
                stripePaymentMethodId: paymentMethod.id,
                type: paymentMethod.type,
                last4: paymentMethod.card.last4,
                brand: paymentMethod.card.brand,
                isDefault: user.paymentMethods.length === 0
              });
              await user.save();
            }
          } catch (pmError) {
            console.warn('Error saving payment method:', pmError);
            // Don't fail the order if payment method saving fails
          }
        }

        console.log(`✅ Order confirmed: ${order.orderNumber} for user: ${user.email}`);

        res.json({
          success: true,
          message: 'Payment confirmed and order placed successfully',
          data: {
            order: {
              id: order._id,
              orderNumber: order.orderNumber,
              status: order.status,
              paymentStatus: order.paymentStatus,
              totalAmount: order.totalAmount,
              estimatedDelivery: order.estimatedDelivery
            }
          }
        });

      } else if (paymentIntent.status === 'requires_action') {
        res.json({
          success: false,
          message: 'Payment requires additional authentication',
          code: 'REQUIRES_ACTION',
          requiresAction: true,
          paymentIntent: {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret
          }
        });

      } else {
        // Payment failed
        order.status = 'cancelled';
        order.paymentStatus = 'failed';
        order.statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: `Payment failed: ${paymentIntent.status}`
        });
        await order.save();

        res.status(400).json({
          success: false,
          message: 'Payment was not successful',
          code: 'PAYMENT_FAILED',
          paymentStatus: paymentIntent.status
        });
      }

    } catch (error) {
      console.error('Confirm payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during payment confirmation.'
      });
    }
  }

  // Stripe Webhook Handler
  static async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await StripeController.handlePaymentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await StripeController.handlePaymentFailed(event.data.object);
          break;

        case 'customer.created':
          await StripeController.handleCustomerCreated(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await StripeController.handleInvoicePaymentSucceeded(event.data.object);
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });

    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }

  // Handle successful payment webhook
  static async handlePaymentSucceeded(paymentIntent) {
    try {
      const order = await Order.findOne({
        stripePaymentIntentId: paymentIntent.id
      });

      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        order.statusHistory.push({
          status: 'confirmed',
          timestamp: new Date(),
          note: 'Payment confirmed via webhook'
        });

        await order.save();

        console.log(`📧 Webhook: Payment succeeded for order ${order.orderNumber}`);
      }
    } catch (error) {
      console.error('Error handling payment succeeded webhook:', error);
    }
  }

  // Handle failed payment webhook
  static async handlePaymentFailed(paymentIntent) {
    try {
      const order = await Order.findOne({
        stripePaymentIntentId: paymentIntent.id
      });

      if (order && order.paymentStatus !== 'failed') {
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: 'Payment failed via webhook'
        });

        await order.save();

        console.log(`❌ Webhook: Payment failed for order ${order.orderNumber}`);
      }
    } catch (error) {
      console.error('Error handling payment failed webhook:', error);
    }
  }

  // Handle customer created webhook
  static async handleCustomerCreated(customer) {
    try {
      if (customer.metadata && customer.metadata.userId) {
        const user = await User.findById(customer.metadata.userId);
        if (user && !user.stripeCustomerId) {
          user.stripeCustomerId = customer.id;
          await user.save();

          console.log(`👤 Webhook: Customer created for user ${user.email}`);
        }
      }
    } catch (error) {
      console.error('Error handling customer created webhook:', error);
    }
  }

  // Handle invoice payment succeeded webhook
  static async handleInvoicePaymentSucceeded(invoice) {
    try {
      // Handle subscription or recurring payment logic here
      console.log(`💰 Webhook: Invoice payment succeeded: ${invoice.id}`);
    } catch (error) {
      console.error('Error handling invoice payment succeeded webhook:', error);
    }
  }

  // Get user's saved payment methods
  static async getPaymentMethods(req, res) {
    try {
      const user = req.user;

      if (!user.stripeCustomerId) {
        return res.json({
          success: true,
          data: {
            paymentMethods: []
          }
        });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });

      const formattedMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year
        } : null,
        created: pm.created
      }));

      res.json({
        success: true,
        data: {
          paymentMethods: formattedMethods
        }
      });

    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving payment methods'
      });
    }
  }

  // Delete a payment method
  static async deletePaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.params;
      const user = req.user;

      // Detach payment method from customer
      await stripe.paymentMethods.detach(paymentMethodId);

      // Remove from user's saved payment methods
      user.paymentMethods = user.paymentMethods.filter(
        pm => pm.stripePaymentMethodId !== paymentMethodId
      );
      await user.save();

      res.json({
        success: true,
        message: 'Payment method deleted successfully'
      });

    } catch (error) {
      console.error('Delete payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting payment method'
      });
    }
  }
}

module.exports = StripeController;