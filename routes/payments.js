const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const { authenticate: auth, authorize } = require('../middleware/security');

const router = express.Router();

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe checkout session
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { orderId, items, customerInfo, totals } = req.body;

    // Validate required fields
    if (!orderId || !items || !customerInfo || !totals) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: `Quantity: ${item.quantity}`,
            images: item.image ? [item.image] : undefined,
          },
          unit_amount: Math.round(item.price * 100), // Stripe expects cents
        },
        quantity: item.quantity,
      })),
      // Add tax as a separate line item
      ...(totals.tax > 0 && {
        line_items: [
          ...items.map(item => ({
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.name,
                description: `Quantity: ${item.quantity}`,
                images: item.image ? [item.image] : undefined,
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
          })),
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'NY State Tax (8.875%)',
                description: 'State sales tax',
              },
              unit_amount: totals.tax,
            },
            quantity: 1,
          }
        ]
      }),
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/order-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout?canceled=true&order_id=${orderId}`,
      customer_email: customerInfo.email,
      metadata: {
        orderId: orderId,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
        customerPhone: customerInfo.phone,
      },
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      billing_address_collection: 'required',
    });

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/payments/create-payment-session
 * Create Stripe checkout session for custom payment amount (extra payment or remaining payment)
 * No authentication required - anyone can pay for an order
 */
router.post('/create-payment-session', async (req, res) => {
  try {
    const { orderId, amount, paymentType, orderNumber, customerEmail } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and amount are required'
      });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // No user verification required - anyone can pay for any order

    // Validate amount for remaining payments
    if (paymentType === 'remaining_payment' && order.remainingAmount) {
      if (paymentAmount > order.remainingAmount) {
        return res.status(400).json({
          success: false,
          message: `Amount cannot exceed remaining balance of $${order.remainingAmount.toFixed(2)}`
        });
      }
    }

    // Create Stripe checkout session
    const sessionName = paymentType === 'remaining_payment' 
      ? `Remaining Payment - Order #${order.orderNumber || orderNumber}`
      : `Extra Payment - Order #${order.orderNumber || orderNumber}`;
    
    const sessionDescription = paymentType === 'remaining_payment'
      ? `Complete payment for order ${order.orderNumber || orderNumber}`
      : `Additional payment for order ${order.orderNumber || orderNumber}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: sessionName,
            description: sessionDescription,
          },
          unit_amount: Math.round(paymentAmount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}&${paymentType === 'remaining_payment' ? 'remaining_payment=true' : 'extra_payment=true'}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?orderId=${orderId}&canceled=true`,
      customer_email: customerEmail || order.shippingAddress?.email || undefined,
      metadata: {
        orderId: orderId,
        orderNumber: order.orderNumber || orderNumber,
        paymentType: paymentType || 'extra_payment',
        amount: paymentAmount.toString(),
      },
      billing_address_collection: 'required',
    });

    // Update order with Stripe session ID
    order.stripeSessionId = session.id;
    await order.save();

    console.log(`💳 Payment session created: ${session.id} for order: ${order.orderNumber || orderNumber}, amount: $${paymentAmount}`);

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      amount: paymentAmount
    });

  } catch (error) {
    console.error('Payment session creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment session',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/payments/pay-remaining
 * Create Stripe checkout session for remaining payment on an existing order
 */
router.post('/pay-remaining', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify the order belongs to the user
    const orderUserId = order.userId?.toString() || order.user?.toString();
    if (orderUserId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to pay for this order'
      });
    }

    // Check if there's a remaining amount to pay
    const remainingAmount = order.remainingAmount || 0;
    if (remainingAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No remaining amount to pay for this order'
      });
    }

    // Check if payment status is partial
    if (order.paymentStatus !== 'partial') {
      return res.status(400).json({
        success: false,
        message: 'This order does not have a remaining payment'
      });
    }

    // Create Stripe checkout session for remaining amount
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Remaining Payment - Order #${order.orderNumber}`,
            description: `Complete payment for order ${order.orderNumber}`,
          },
          unit_amount: Math.round(remainingAmount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}&remaining_payment=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders?canceled=true&order_id=${orderId}`,
      customer_email: req.user.email,
      metadata: {
        orderId: orderId,
        orderNumber: order.orderNumber,
        paymentType: 'remaining_payment',
        userId: userId.toString(),
        userEmail: req.user.email,
      },
      billing_address_collection: 'required',
    });

    // Update order with Stripe session ID
    order.stripeSessionId = session.id;
    await order.save();

    console.log(`💳 Remaining payment session created: ${session.id} for order: ${order.orderNumber}`);

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      remainingAmount: remainingAmount
    });

  } catch (error) {
    console.error('Remaining payment session creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment session',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/payments/webhook
 * Stripe webhook to handle payment events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;

        try {
          // Update order status
          const orderId = session.metadata.orderId;
          const order = await Order.findById(orderId);
          
          if (!order) {
            console.error('Order not found for session:', session.id);
          } else {
            // Check if this is a remaining payment (from orders page)
            const isRemainingPayment = session.metadata?.paymentType === 'remaining_payment';
            
            // Check if this is a partial payment completion
            if (isRemainingPayment || (order.paymentStatus === 'partial' && order.remainingAmount > 0)) {
              // Complete the remaining/partial payment
              order.paymentStatus = 'completed';
              order.paidAt = new Date();
              order.status = 'confirmed';
              order.paymentId = session.payment_intent;
              order.stripeSessionId = session.id;
              // Clear remaining amount since it's now fully paid
              order.remainingAmount = 0;
              await order.save();
              console.log(`✅ Remaining payment completed for order: ${order.orderNumber} (${orderId})`);
            } else {
              // Full payment
              order.paymentStatus = 'completed';
              order.paymentId = session.payment_intent;
              order.stripeSessionId = session.id;
              order.paidAt = new Date();
              await order.save();
              console.log(`✅ Order payment completed: ${order.orderNumber} (${orderId})`);
            }
          }
      } catch (error) {
        console.error('Error updating order after payment:', error);
      }
      break;

    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired':
      const failedSession = event.data.object;

      try {
        // Update order status to failed
        const orderId = failedSession.metadata.orderId;
        await Order.findByIdAndUpdate(
          orderId,
          {
            paymentStatus: 'failed',
            stripeSessionId: failedSession.id
          }
        );
        console.log('Order payment failed/expired:', orderId);
      } catch (error) {
        console.error('Error updating failed order:', error);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * GET /api/payments/session/:sessionId
 * Get payment session details
 */
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      success: true,
      data: {
        id: session.id,
        payment_status: session.payment_status,
        payment_intent: session.payment_intent,
        customer_email: session.customer_email,
        amount_total: session.amount_total,
        currency: session.currency
      }
    });
  } catch (error) {
    console.error('Error retrieving payment session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment session'
    });
  }
});

/**
 * POST /api/payments/process-otc
 * Process OTC (Over-the-Counter) card payment
 */
router.post('/process-otc', auth, authorize(['admin']), async (req, res) => {
  try {
    const { orderId, cards, customerInfo, totals } = req.body;

    // Validate required fields
    if (!orderId || !cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId and cards array'
      });
    }

    // Validate cards - minimal validation, accept any input
    // Accept any card number, PIN (optional), and name format
    let totalCardAmount = 0;
    for (const card of cards) {
      // Accept any name - if empty, use default
      const cardName = (card.name && card.name.trim()) ? card.name.trim() : 'Cardholder';
      
      // Accept any card number format - if empty, use placeholder
      const cardNumber = (card.cardNumber && card.cardNumber.trim()) ? card.cardNumber.trim() : 'N/A';
      
      // PIN is completely optional - accept any value or empty
      const cardPin = card.pin || '';
      
      // Accept any amount > 0, default to order total if not provided
      const cardAmount = card.amount ? parseFloat(card.amount) : (totals?.total || 0);
      
      if (cardAmount <= 0) {
        // If amount is invalid, use order total divided by number of cards
        totalCardAmount += (totals?.total || 0) / cards.length;
      } else {
        totalCardAmount += cardAmount;
      }
    }

    // For OTC/EBT, accept any amount - don't validate against order total
    // Just ensure we have a positive amount
    if (totalCardAmount <= 0) {
      totalCardAmount = totals?.total || 0;
    }

    // Find and update order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Process OTC payment (in a real system, this would integrate with OTC payment processor)
    // For now, we'll simulate successful payment - always succeed
    // Save full card details for admin processing
    const paymentCards = cards.map(card => ({
      name: (card.name && card.name.trim()) ? card.name.trim() : 'Cardholder',
      cardNumber: (card.cardNumber && card.cardNumber.trim()) ? card.cardNumber.trim() : 'N/A',
      pin: card.pin || '', // PIN is optional - accept any value or empty
      amount: card.amount ? parseFloat(card.amount) : (totalCardAmount / cards.length),
      type: 'otc'
    }));

    // Check if this is a partial payment
    const isPartialPayment = totals?.remaining !== undefined && totals.remaining > 0.01;

    // Update order with payment information
    // For partial payment, mark as partially paid
    if (isPartialPayment) {
      order.paymentStatus = 'partial';
      order.partialPaymentAmount = totalCardAmount;
      order.remainingAmount = totals.remaining || 0;
    } else {
      order.paymentStatus = 'completed';
    }
    order.paymentMethod = 'otc';
    order.paymentCards = paymentCards;
    if (!isPartialPayment) {
      order.paidAt = new Date();
      order.status = 'confirmed';
    } else {
      order.status = 'pending'; // Keep as pending until Stripe payment completes
    }

    await order.save();

    console.log(`✅ OTC Payment processed for order ${order.orderNumber}`);

    res.json({
      success: true,
      message: 'OTC payment processed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentMethod: 'otc',
        cardsProcessed: cards.length,
        totalAmount: totalCardAmount
      }
    });

  } catch (error) {
    console.error('OTC payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process OTC payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/payments/process-ebt
 * Process EBT (Electronic Benefit Transfer) card payment
 */
router.post('/process-ebt', auth, authorize(['admin']), async (req, res) => {
  try {
    const { orderId, cards, customerInfo, totals } = req.body;

    // Validate required fields
    if (!orderId || !cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId and cards array'
      });
    }

    // Validate cards - minimal validation, accept any input
    // Accept any card number, PIN (optional), and name format
    let totalCardAmount = 0;
    for (const card of cards) {
      // Accept any name - if empty, use default
      const cardName = (card.name && card.name.trim()) ? card.name.trim() : 'Cardholder';
      
      // Accept any card number format - if empty, use placeholder
      const cardNumber = (card.cardNumber && card.cardNumber.trim()) ? card.cardNumber.trim() : 'N/A';
      
      // PIN is completely optional - accept any value or empty
      const cardPin = card.pin || '';
      
      // Accept any amount > 0, default to order total if not provided
      const cardAmount = card.amount ? parseFloat(card.amount) : (totals?.total || 0);
      
      if (cardAmount <= 0) {
        // If amount is invalid, use order total divided by number of cards
        totalCardAmount += (totals?.total || 0) / cards.length;
      } else {
        totalCardAmount += cardAmount;
      }
    }

    // For OTC/EBT, accept any amount - don't validate against order total
    // Just ensure we have a positive amount
    if (totalCardAmount <= 0) {
      totalCardAmount = totals?.total || 0;
    }

    // Find and update order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Process EBT payment (in a real system, this would integrate with EBT payment processor)
    // For now, we'll simulate successful payment - always succeed
    // Save full card details for admin processing
    const paymentCards = cards.map(card => ({
      name: (card.name && card.name.trim()) ? card.name.trim() : 'Cardholder',
      cardNumber: (card.cardNumber && card.cardNumber.trim()) ? card.cardNumber.trim() : 'N/A',
      pin: card.pin || '', // PIN is optional - accept any value or empty
      amount: card.amount ? parseFloat(card.amount) : (totalCardAmount / cards.length),
      type: 'ebt'
    }));

    // Update order with payment information
    // For partial payment, mark as partially paid
    const isPartialPayment = totals?.remaining !== undefined && totals.remaining > 0.01;
    if (isPartialPayment) {
      order.paymentStatus = 'partial';
      order.partialPaymentAmount = totalCardAmount;
      order.remainingAmount = totals.remaining || 0;
    } else {
      order.paymentStatus = 'completed';
    }
    order.paymentMethod = 'ebt';
    order.paymentCards = paymentCards;
    if (!isPartialPayment) {
      order.paidAt = new Date();
      order.status = 'confirmed';
    } else {
      order.status = 'pending'; // Keep as pending until Stripe payment completes
    }

    await order.save();

    console.log(`✅ EBT Payment processed for order ${order.orderNumber}`);

    res.json({
      success: true,
      message: 'EBT payment processed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentMethod: 'ebt',
        cardsProcessed: cards.length,
        totalAmount: totalCardAmount
      }
    });

  } catch (error) {
    console.error('EBT payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process EBT payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;