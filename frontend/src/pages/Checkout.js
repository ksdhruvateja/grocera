import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Checkout.css';

function Checkout() {
  const navigate = useNavigate();
  const { items, total, itemCount, clearCart } = useCart();
  const { user } = useAuth();
  
  // NY State tax rate
  const NY_TAX_RATE = 0.08875; // 8.875%
  
  // Tip state
  const [tipAmount, setTipAmount] = useState(0);
  const [tipInput, setTipInput] = useState('');
  
  // Calculate totals
  const subtotal = total;
  const taxAmount = subtotal * NY_TAX_RATE;
  const shippingAmount = subtotal < 35 ? 10 : 0; // $10 shipping if below $35, free if $35+
  const tip = parseFloat(tipAmount) || 0;
  const finalTotal = subtotal + taxAmount + shippingAmount + tip;
  
  // Customer information state
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'NY',
    zipCode: ''
  });

  // State declarations - must be before useEffect hooks that use them
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'credit', 'otc', 'ebt'
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState('');
  
  // OTC/EBT card state
  const [cards, setCards] = useState([{
    id: 1,
    name: '',
    cardNumber: '',
    pin: '',
    amount: 0 // Will be updated in useEffect
  }]);
  const [useMultipleCards, setUseMultipleCards] = useState(false);
  const [usePartialPayment, setUsePartialPayment] = useState(false); // Allow partial payment with credit card
  const [remainingAmount, setRemainingAmount] = useState(0); // Amount to pay with credit card
  const [otcEbtAmount, setOtcEbtAmount] = useState(''); // Amount to be debited from OTC/EBT card
  const [creditCardAmount, setCreditCardAmount] = useState(''); // Amount to be paid via credit/debit card

  // Load user profile data on component mount
  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem('userProfile')) || {};
    setCustomerInfo({
      firstName: user?.name?.split(' ')[0] || savedProfile.firstName || '',
      lastName: user?.name?.split(' ').slice(1).join(' ') || savedProfile.lastName || '',
      email: user?.email || savedProfile.email || '',
      phone: savedProfile.phone || '',
      address: savedProfile.address || '',
      city: savedProfile.city || '',
      state: 'NY',
      zipCode: savedProfile.zipCode || ''
    });
  }, [user]);

  // Check if user came back from Stripe cancel
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('canceled') === 'true') {
      // Reset all payment-related state completely
      setPaymentMethod('');
      setShowPaymentForm(true);
      setIsProcessing(false);
      setUsePartialPayment(false);
      setOtcEbtAmount('');
      setCreditCardAmount('');
      setRemainingAmount(0);
      // Reset cards to default
      setCards([{
        id: 1,
        name: '',
        cardNumber: '',
        pin: '',
        amount: finalTotal
      }]);
      // Clean up URL completely - remove canceled parameter
      window.history.replaceState({}, document.title, '/checkout');
    }
  }, [finalTotal]);

  // Calculate remaining amount for partial payment
  useEffect(() => {
    if (usePartialPayment) {
      // If user has entered amounts manually, use those
      if (otcEbtAmount && creditCardAmount) {
        const otcEbt = parseFloat(otcEbtAmount) || 0;
        const credit = parseFloat(creditCardAmount) || 0;
        setRemainingAmount(credit);
        // Update cards to reflect OTC/EBT amount
        if (cards.length > 0) {
          setCards(prevCards => {
            const newCards = [...prevCards];
            newCards[0] = {
              ...newCards[0],
              amount: otcEbt
            };
            return newCards;
          });
        }
      } else if (cards.length > 0) {
        // Auto-calculate from card amounts
        const totalCardAmount = cards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
        const remaining = Math.max(0, finalTotal - totalCardAmount);
        setRemainingAmount(remaining);
        setOtcEbtAmount(totalCardAmount.toFixed(2));
        setCreditCardAmount(remaining.toFixed(2));
      }
    } else {
      setRemainingAmount(0);
      setOtcEbtAmount('');
      setCreditCardAmount('');
    }
  }, [cards, usePartialPayment, finalTotal, otcEbtAmount, creditCardAmount]);

  // Reset cards when payment method changes
  useEffect(() => {
    if (paymentMethod === 'otc' || paymentMethod === 'ebt') {
      setCards([{
        id: 1,
        name: '',
        cardNumber: '',
        pin: '',
        amount: finalTotal
      }]);
      setUseMultipleCards(false);
    }
  }, [paymentMethod, finalTotal]);

  // Redirect if cart is empty
  if (itemCount === 0) {
    navigate('/cart');
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!customerInfo.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!customerInfo.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!customerInfo.email.trim()) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(customerInfo.email)) newErrors.email = 'Email is invalid';
    if (!customerInfo.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) newErrors.phone = 'Phone must be 10 digits';
    if (!customerInfo.address.trim()) newErrors.address = 'Address is required';
    if (!customerInfo.city.trim()) newErrors.city = 'City is required';
    if (!customerInfo.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!/^\d{5}$/.test(customerInfo.zipCode)) newErrors.zipCode = 'ZIP code must be 5 digits';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (method) => {
    // For OTC/EBT cards, show disclaimer first
    if (method === 'otc' || method === 'ebt') {
      setPendingPaymentMethod(method);
      setShowDisclaimer(true);
    } else {
      // For credit card, proceed directly
      setPaymentMethod(method);
      setShowPaymentForm(true);
    }
  };

  // Handle disclaimer acknowledgment
  const handleDisclaimerAccept = () => {
    setPaymentMethod(pendingPaymentMethod);
    setShowPaymentForm(true);
    setShowDisclaimer(false);
    setPendingPaymentMethod('');
  };

  // Handle disclaimer cancel
  const handleDisclaimerCancel = () => {
    setShowDisclaimer(false);
    setPendingPaymentMethod('');
  };

  // Handle OTC/EBT card changes
  const handleCardChange = (cardId, field, value) => {
    setCards(prevCards => prevCards.map(card => {
      if (card.id === cardId) {
        const updatedCard = { ...card, [field]: value };
        // If amount changed and it's a number field, ensure it's a number
        if (field === 'amount' && typeof value === 'string') {
          updatedCard[field] = parseFloat(value) || 0;
        }
        return updatedCard;
      }
      return card;
    }));
  };

  // Add new card for multiple payment
  const handleAddCard = () => {
    setCards(prevCards => {
      const tip = parseFloat(tipAmount) || 0;
      const currentTotal = subtotal + taxAmount + shippingAmount + tip;
      const remainingAmount = currentTotal - prevCards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
      return [...prevCards, {
        id: prevCards.length + 1,
        name: '',
        cardNumber: '',
        pin: '',
        amount: remainingAmount > 0 ? remainingAmount : 0
      }];
    });
  };

  // Remove card
  const handleRemoveCard = (cardId) => {
    if (cards.length > 1) {
      setCards(prevCards => {
        const remainingCards = prevCards.filter(c => c.id !== cardId);
        const tip = parseFloat(tipAmount) || 0;
        const currentTotal = subtotal + taxAmount + shippingAmount + tip;
        const remainingAmount = currentTotal - remainingCards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
        
        // Redistribute amount to first card
        if (remainingCards.length > 0 && remainingAmount > 0) {
          remainingCards[0] = {
            ...remainingCards[0],
            amount: (parseFloat(remainingCards[0].amount) || 0) + remainingAmount
          };
        }
        
        return remainingCards;
      });
    }
  };

  // Distribute amount evenly across cards
  const handleDistributeEvenly = () => {
    const tip = parseFloat(tipAmount) || 0;
    const currentTotal = subtotal + taxAmount + shippingAmount + tip;
    const amountPerCard = currentTotal / cards.length;
    setCards(prevCards => prevCards.map(card => ({
      ...card,
      amount: amountPerCard.toFixed(2)
    })));
  };

  // Validate OTC/EBT cards - minimal validation, accept any input
  // Automatically accept card number, PIN (optional), and name
  const validateCards = () => {
    // For OTC/EBT, accept any input - no strict validation
    // Just ensure we have at least one card entry
    if (cards.length === 0) {
      // Auto-create a card entry if none exists
      const tip = parseFloat(tipAmount) || 0;
      const currentTotal = subtotal + taxAmount + shippingAmount + tip;
      setCards([{
        name: '',
        cardNumber: '',
        pin: '',
        amount: usePartialPayment ? (parseFloat(otcEbtAmount) || 0) : currentTotal
      }]);
    }
    
    // If partial payment is enabled, ensure amounts are set
    if (usePartialPayment) {
      const otcEbt = parseFloat(otcEbtAmount) || 0;
      const credit = parseFloat(creditCardAmount) || 0;
      
      // Auto-calculate if amounts are not set
      if (otcEbt <= 0 && credit <= 0) {
        const tip = parseFloat(tipAmount) || 0;
        const currentTotal = subtotal + taxAmount + shippingAmount + tip;
        // Default: split 50/50 or use OTC for full amount if credit is 0
        if (credit <= 0) {
          setOtcEbtAmount(currentTotal.toFixed(2));
        } else {
          setOtcEbtAmount((currentTotal - credit).toFixed(2));
        }
      }
      
      // Update remaining amount
      const finalCredit = parseFloat(creditCardAmount) || 0;
      setRemainingAmount(finalCredit);
      
      // Update card amounts to match OTC/EBT amount
      if (cards.length > 0) {
        const finalOtcEbt = parseFloat(otcEbtAmount) || 0;
        setCards(prevCards => {
          const newCards = [...prevCards];
          newCards[0] = {
            ...newCards[0],
            amount: finalOtcEbt > 0 ? finalOtcEbt : (finalTotal - finalCredit)
          };
          return newCards;
        });
      }
    } else {
      // Full payment - auto-set amount if not provided
      const tip = parseFloat(tipAmount) || 0;
      const currentTotal = subtotal + taxAmount + shippingAmount + tip;
      const totalCardAmount = cards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
      
      // If no amount set, use order total
      if (totalCardAmount <= 0 && cards.length > 0) {
        setCards(prevCards => {
          const newCards = [...prevCards];
          newCards[0] = {
            ...newCards[0],
            amount: currentTotal
          };
          return newCards;
        });
      }
    }
    
    // Always return true for OTC/EBT - accept any input
    return true;
  };

  // Handle customer info submission (step 1)
  const handleCustomerInfoSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Save customer info and proceed to payment method selection
    localStorage.setItem('userProfile', JSON.stringify(customerInfo));
    setShowPaymentForm(true);
  };

  // Handle final payment submission
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to complete your order');
        navigate('/login');
        setIsProcessing(false);
        return;
      }
      
      // Validate cart items before proceeding
      if (!items || items.length === 0) {
        alert('Your cart is empty. Please add items before checkout.');
        navigate('/cart');
        setIsProcessing(false);
        return;
      }

      // Validate that all items have valid product IDs
      const invalidItems = items.filter(item => !item.product || (!item.product._id && !item.product.id));
      if (invalidItems.length > 0) {
        alert('Some items in your cart are invalid. Please refresh and try again.');
        setIsProcessing(false);
        return;
      }

      // Create order in backend - use a simpler endpoint that accepts items directly
      const orderData = {
        items: items.map(item => ({
          product: item.product._id || item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          displayName: item.product.displayName || item.product.name, // Include displayName for vegetables with weight
          selectedWeight: item.product.selectedWeight // Include weight for vegetables
        })),
        customerInfo,
        shippingAddress: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          street: customerInfo.address,
          city: customerInfo.city,
          state: customerInfo.state,
          zipCode: customerInfo.zipCode,
          country: 'United States',
          phone: customerInfo.phone
        },
        totals: {
          subtotal: subtotal,
          tax: taxAmount,
          shipping: shippingAmount,
          tip: tip,
          total: finalTotal
        },
        paymentStatus: 'pending',
        paymentMethod: paymentMethod
      };
      
      // Use a custom endpoint that handles direct order creation with items
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/orders/create-direct`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: `Server error: ${response.status} ${response.statusText}` };
        }
        throw new Error(errorData.message || errorData.error || `Failed to create order (${response.status})`);
      }
      
      const order = await response.json();
      const orderId = order.data?._id || order._id || order.id;
      
      if (!orderId) {
        throw new Error('Order created but no order ID returned');
      }
      
      // Handle different payment methods
      if (paymentMethod === 'credit') {
        // Redirect to Stripe for credit/debit cards
        const checkoutResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: orderId,
            items: items.map(item => ({
              name: item.product.name,
              price: item.product.price,
              quantity: item.quantity,
              image: item.product.image
            })),
            customerInfo,
            totals: {
              subtotal: Math.round(subtotal * 100),
              tax: Math.round(taxAmount * 100),
              total: Math.round(finalTotal * 100)
            }
          })
        });
        
        const session = await checkoutResponse.json();
        
        if (session.url) {
          // Don't clear cart yet - wait for successful payment
          window.location.href = session.url;
        } else {
          throw new Error('Failed to create checkout session');
        }
      } else if (paymentMethod === 'otc' || paymentMethod === 'ebt') {
        // Process OTC/EBT payment
        if (!validateCards()) {
          setIsProcessing(false);
          return;
        }
        
        // ...existing code...
        const needsCreditCard = usePartialPayment && parseFloat(creditCardAmount) > 0.01;
        
        // If partial payment, first process OTC/EBT cards, then redirect to Stripe for remaining
        if (needsCreditCard) {
          // Process partial payment with OTC/EBT cards first
          const paymentHeaders = {
            'Content-Type': 'application/json'
          };
          if (token) {
            paymentHeaders['Authorization'] = `Bearer ${token}`;
          }
          
          // Process OTC/EBT cards for partial amount
          const partialPaymentResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/process-${paymentMethod}`, {
            method: 'POST',
            headers: paymentHeaders,
            body: JSON.stringify({
              orderId: orderId,
              cards: cards.map(card => ({
                name: card.name,
                cardNumber: card.cardNumber || '', // Accept any format
                pin: card.pin || '', // Optional - accept any value or empty
                amount: parseFloat(card.amount)
              })),
              customerInfo,
              totals: {
                subtotal: subtotal,
                tax: taxAmount,
                total: finalTotal, // Full order total
                remaining: parseFloat(creditCardAmount) || remainingAmount // Amount to pay with credit card
              }
            })
          });
          
          if (!partialPaymentResponse.ok) {
            const errorData = await partialPaymentResponse.json();
            throw new Error(errorData.message || 'Partial payment processing failed');
          }
          
          // Now redirect to Stripe for remaining amount
          const checkoutResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/create-checkout-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              orderId: orderId,
              items: items.map(item => ({
                name: item.product.name,
                price: item.product.price,
                quantity: item.quantity,
                image: item.product.image
              })),
              customerInfo,
              totals: {
                subtotal: Math.round((parseFloat(creditCardAmount) || remainingAmount) * 100), // Remaining amount in cents
                tax: 0, // Tax already included in OTC/EBT portion
                tip: Math.round(tip * 100), // Tip in cents
                total: Math.round((parseFloat(creditCardAmount) || remainingAmount + tip) * 100)
              },
              isPartialPayment: true,
              partialAmount: parseFloat(creditCardAmount) || remainingAmount
            })
          });
          
          const session = await checkoutResponse.json();
          
          if (session.url) {
            // Don't clear cart yet - wait for Stripe completion
            window.location.href = session.url;
          } else {
            throw new Error('Failed to create checkout session for remaining amount');
          }
        } else {
          // Full payment with OTC/EBT cards only
          const paymentHeaders = {
            'Content-Type': 'application/json'
          };
          if (token) {
            paymentHeaders['Authorization'] = `Bearer ${token}`;
          }
          
          const paymentResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/process-${paymentMethod}`, {
            method: 'POST',
            headers: paymentHeaders,
            body: JSON.stringify({
              orderId: orderId,
              cards: cards.map(card => ({
                name: card.name,
                cardNumber: card.cardNumber || '', // Accept any format
                pin: card.pin || '', // Optional - accept any value or empty
                amount: parseFloat(card.amount)
              })),
              customerInfo,
              totals: {
                subtotal: subtotal,
                tax: taxAmount,
                tip: tip,
                total: finalTotal
              }
            })
          });
          
          if (!paymentResponse.ok) {
            const errorData = await paymentResponse.json();
            throw new Error(errorData.message || 'Payment processing failed');
          }
          
          const paymentResult = await paymentResponse.json();
          
          if (paymentResult.success) {
            clearCart();
            navigate(`/order-success?order_id=${orderId}&payment_method=${paymentMethod}`);
          } else {
            throw new Error(paymentResult.message || 'Payment failed');
          }
        }
      }
      
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error.message || 'There was an error processing your order. Please try again.';
      alert(`Error: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="checkout-container">
      <div className="container">
        <div className="checkout-header">
          <h1>🛒 Checkout</h1>
          <div className="checkout-steps">
            <div className={`step ${!showPaymentForm ? 'active' : 'completed'}`}>1. Review Order</div>
            <div className={`step ${!showPaymentForm ? 'active' : 'completed'}`}>2. Customer Info</div>
            <div className={`step ${showPaymentForm ? 'active' : ''}`}>3. Payment</div>
          </div>
        </div>

        <div className="checkout-content">
          {/* Order Review Section */}
          <div className="order-review">
            <h2>📋 Order Review</h2>
            <div className="order-items">
              {items.map((item) => (
                <div key={item.product._id || item.product.id} className="order-item">
                  <div className="item-image">
                    <img 
                      src={item.product.image || '/api/placeholder/60/60'} 
                      alt={item.product.name}
                    />
                  </div>
                  <div className="item-details">
                    <h4>{item.product.name}</h4>
                    <p className="item-category">{item.product.category}</p>
                  </div>
                  <div className="item-pricing">
                    {(() => {
                      const isVeg = item.product?.category?.toLowerCase().includes('vegetable') || 
                                   item.product?.category === 'Fresh Vegetables';
                      const weight = item.product?.selectedWeight;
                      const unitPrice = item.product.price?.toFixed(2) || '0.00';
                      const lineTotal = isVeg && weight 
                        ? (item.product.price * weight * item.quantity).toFixed(2)
                        : (item.product.price * item.quantity).toFixed(2);
                      
                      return (
                        <>
                          <div className="unit-price">
                            ${unitPrice} {isVeg && weight ? 'per lb' : 'each'}
                          </div>
                          <div className="quantity">Qty: {item.quantity}</div>
                          {isVeg && weight && (
                            <div className="weight-info">Weight: {weight} lb</div>
                          )}
                          <div className="line-total">${lineTotal}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Order Totals */}
            <div className="order-totals">
              <div className="total-line">
                <span>Subtotal ({itemCount} items):</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="total-line">
                <span>NY State Tax (8.875%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="total-line shipping">
                <span>Shipping:</span>
                {shippingAmount > 0 ? (
                  <span className="shipping-cost">${shippingAmount.toFixed(2)}</span>
                ) : (
                  <span className="free">FREE</span>
                )}
              </div>
              
              {/* Tip Section */}
              <div className="tip-section">
                <div className="tip-header">
                  <span className="tip-icon">💝</span>
                  <span className="tip-label">Love your order? Tip your shopper!</span>
                </div>
                <div className="tip-options">
                  <button
                    type="button"
                    className={`tip-btn ${tipAmount === 2 ? 'active' : ''}`}
                    onClick={() => {
                      setTipAmount(15);
                      setTipInput('');
                    }}
                  >
                    $15
                  </button>
                </div>
                <div className="tip-custom">
                  <input
                    type="number"
                    placeholder="Custom amount"
                    min="0"
                    step="0.01"
                    value={tipInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTipInput(value);
                      const numValue = parseFloat(value) || 0;
                      setTipAmount(numValue);
                    }}
                    className="tip-input"
                  />
                </div>
                {tip > 0 && (
                  <div className="tip-selected">
                    <span>Selected Tip:</span>
                    <span className="tip-amount">${tip.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <div className="total-line final">
                <span>Final Total:</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
              
              {/* Checkout Button */}
              <div className="checkout-button-section">
                <button 
                  type="button"
                  className="btn btn-primary checkout-final-btn"
                  onClick={() => {
                    if (!showPaymentForm) {
                      // If customer info form is not shown yet, validate and submit it
                      if (validateForm()) {
                        localStorage.setItem('userProfile', JSON.stringify(customerInfo));
                        setShowPaymentForm(true);
                        // Scroll to payment section
                        setTimeout(() => {
                          document.querySelector('.payment-section')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      } else {
                        // Scroll to customer info form to show errors
                        document.querySelector('.customer-info')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    } else {
                      // If payment form is shown, trigger payment submission if payment method is selected
                      if (paymentMethod) {
                        const form = document.querySelector('.payment-section form');
                        if (form) {
                          const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
                          form.dispatchEvent(submitEvent);
                        }
                      } else {
                        // Scroll to payment method selection
                        document.querySelector('.payment-methods')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <span className="spinner"></span>
                      Processing...
                    </>
                  ) : !showPaymentForm ? (
                    <>
                      🛒 Proceed to Checkout
                    </>
                  ) : paymentMethod ? (
                    <>
                      💳 Complete Order - ${finalTotal.toFixed(2)}
                    </>
                  ) : (
                    <>
                      🛒 Continue to Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Customer Information Form */}
          {!showPaymentForm ? (
            <div className="customer-info">
              <h2>👤 Customer Information</h2>
              <form onSubmit={handleCustomerInfoSubmit} className="checkout-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={customerInfo.firstName}
                    onChange={handleInputChange}
                    className={errors.firstName ? 'error' : ''}
                    required
                  />
                  {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={customerInfo.lastName}
                    onChange={handleInputChange}
                    className={errors.lastName ? 'error' : ''}
                    required
                  />
                  {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={customerInfo.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                  required
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={customerInfo.phone}
                  onChange={handleInputChange}
                  className={errors.phone ? 'error' : ''}
                  placeholder="(555) 123-4567"
                  required
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="address">Street Address *</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={customerInfo.address}
                  onChange={handleInputChange}
                  className={errors.address ? 'error' : ''}
                  placeholder="123 Main Street, Apt 4B"
                  required
                />
                {errors.address && <span className="error-message">{errors.address}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={customerInfo.city}
                    onChange={handleInputChange}
                    className={errors.city ? 'error' : ''}
                    required
                  />
                  {errors.city && <span className="error-message">{errors.city}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="state">State</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value="NY"
                    readOnly
                    className="readonly"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="zipCode">ZIP Code *</label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={customerInfo.zipCode}
                    onChange={handleInputChange}
                    className={errors.zipCode ? 'error' : ''}
                    placeholder="12345"
                    maxLength="5"
                    required
                  />
                  {errors.zipCode && <span className="error-message">{errors.zipCode}</span>}
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => navigate('/cart')}
                >
                  ← Back to Cart
                </button>
                
                <button 
                  type="submit" 
                  className="btn btn-primary checkout-btn"
                  disabled={isProcessing}
                >
                  Continue to Payment →
                </button>
              </div>
            </form>
          </div>
          ) : (
            <div className="payment-section">
              <h2>💳 Payment Method</h2>
              
              {!paymentMethod ? (
                <div className="payment-methods">
                  <div className="payment-method-card" onClick={() => handlePaymentMethodSelect('credit')}>
                    <div className="payment-icon">💳</div>
                    <h3>Credit / Debit Card</h3>
                    <p>Pay securely with Stripe</p>
                    <div className="payment-badge">Secure</div>
                  </div>
                  
                  <div className="payment-method-card" onClick={() => handlePaymentMethodSelect('otc')}>
                    <div className="payment-icon">💊</div>
                    <h3>OTC Card</h3>
                    <p>Over-the-Counter Benefits Card</p>
                    <div className="payment-badge">Accepted</div>
                  </div>
                  
                  <div className="payment-method-card" onClick={() => handlePaymentMethodSelect('ebt')}>
                    <div className="payment-icon">🛒</div>
                    <h3>EBT Card</h3>
                    <p>Electronic Benefit Transfer</p>
                    <div className="payment-badge">Accepted</div>
                  </div>
                </div>
              ) : paymentMethod === 'credit' ? (
                <form onSubmit={handlePaymentSubmit} className="checkout-form">
                  <div className="payment-info">
                    <p>You will be redirected to Stripe's secure payment page to complete your transaction.</p>
                    <div className="stripe-info">
                      <div className="stripe-icon">🔒</div>
                      <div>
                        <strong>Secure Payment Processing</strong>
                        <p>Your payment will be processed securely through Stripe. We never store your card details.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowPaymentForm(false)}
                    >
                      ← Back
                    </button>
                    
                    <button 
                      type="submit" 
                      className="btn btn-primary checkout-btn"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <span className="spinner"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          💳 Proceed to Stripe - ${finalTotal.toFixed(2)}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePaymentSubmit} className="checkout-form">
                  <div className="payment-type-header">
                    <h3>{paymentMethod.toUpperCase()} Card Payment</h3>
                    <p>Total Amount: <strong>${finalTotal.toFixed(2)}</strong></p>
                  </div>
                  
                  <div className="multiple-cards-option">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={useMultipleCards}
                        onChange={(e) => {
                          setUseMultipleCards(e.target.checked);
                          if (!e.target.checked && cards.length > 1) {
                            setCards([{
                              id: 1,
                              name: cards[0].name,
                              cardNumber: cards[0].cardNumber,
                              pin: cards[0].pin,
                              amount: finalTotal
                            }]);
                          }
                        }}
                      />
                      <span>Use Multiple Cards</span>
                    </label>
                  </div>

                  <div className="partial-payment-option" style={{
                    marginTop: '1rem',
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
                    borderRadius: '8px',
                    border: '2px solid #2196F3',
                    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.2)'
                  }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ 
                        margin: '0 0 0.75rem 0', 
                        fontSize: '1rem', 
                        fontWeight: '700', 
                        color: '#1565C0',
                        lineHeight: '1.5'
                      }}>
                        💳 Partial Payment Option
                      </p>
                      <p style={{ 
                        margin: '0', 
                        fontSize: '0.95rem', 
                        color: '#1976D2',
                        lineHeight: '1.6',
                        fontWeight: '500'
                      }}>
                        Please enter the amount to be debited from your {paymentMethod.toUpperCase()} card. The remaining payment will automatically be processed through Credit/Debit Card via Stripe.
                      </p>
                    </div>
                    
                    <label className="checkbox-label" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      cursor: 'pointer',
                      padding: '0.75rem',
                      background: 'white',
                      borderRadius: '6px',
                      border: '2px solid #2196F3'
                    }}>
                      <input
                        type="checkbox"
                        checked={usePartialPayment}
                        onChange={(e) => {
                          setUsePartialPayment(e.target.checked);
                          if (!e.target.checked) {
                            // Reset to full payment
                            setOtcEbtAmount('');
                            setCreditCardAmount('');
                            setRemainingAmount(0);
                            const totalCardAmount = cards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
                            if (totalCardAmount < finalTotal) {
                              // Adjust first card to cover remaining
                              setCards(prevCards => {
                                const newCards = [...prevCards];
                                const currentTotal = newCards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
                                const remaining = finalTotal - currentTotal;
                                if (newCards.length > 0 && remaining > 0) {
                                  newCards[0] = {
                                    ...newCards[0],
                                    amount: (parseFloat(newCards[0].amount) || 0) + remaining
                                  };
                                }
                                return newCards;
                              });
                            }
                          } else {
                            // Initialize with current card amount
                            const currentCardAmount = cards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
                            if (currentCardAmount > 0 && currentCardAmount < finalTotal) {
                              setOtcEbtAmount(currentCardAmount.toFixed(2));
                              const remaining = finalTotal - currentCardAmount;
                              setCreditCardAmount(remaining.toFixed(2));
                              setRemainingAmount(remaining);
                            }
                          }
                        }}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600', color: '#1565C0', fontSize: '1rem' }}>
                        Enable Partial Payment (Pay remaining with Credit/Debit Card)
                      </span>
                    </label>
                    
                    {usePartialPayment && (
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '1.5rem', 
                        background: 'white', 
                        borderRadius: '6px',
                        border: '2px solid #64B5F6'
                      }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem', 
                            fontSize: '0.95rem', 
                            color: '#1565C0', 
                            fontWeight: '700' 
                          }}>
                            💊 Amount to be debited from {paymentMethod.toUpperCase()} Card: *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={finalTotal}
                            value={otcEbtAmount}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setOtcEbtAmount(e.target.value);
                              // Auto-calculate credit card amount
                              const remaining = Math.max(0, finalTotal - value);
                              setCreditCardAmount(remaining.toFixed(2));
                              setRemainingAmount(remaining);
                            }}
                            placeholder={`Enter amount (max $${finalTotal.toFixed(2)})`}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              fontSize: '1rem',
                              border: '2px solid #2196F3',
                              borderRadius: '8px',
                              color: '#1976D2',
                              fontWeight: '600'
                            }}
                            required
                          />
                          {otcEbtAmount && parseFloat(otcEbtAmount) > 0 && (
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#1976D2' }}>
                              Entered: ${parseFloat(otcEbtAmount).toFixed(2)}
                            </p>
                          )}
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem', 
                            fontSize: '0.95rem', 
                            color: '#1565C0', 
                            fontWeight: '700' 
                          }}>
                            💳 Amount to be paid via Credit/Debit Card: *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={finalTotal}
                            value={creditCardAmount}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setCreditCardAmount(e.target.value);
                              // Auto-calculate OTC/EBT amount
                              const otcEbt = Math.max(0, finalTotal - value);
                              setOtcEbtAmount(otcEbt.toFixed(2));
                              setRemainingAmount(value);
                            }}
                            placeholder={`Enter amount (max $${finalTotal.toFixed(2)})`}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              fontSize: '1rem',
                              border: '2px solid #2196F3',
                              borderRadius: '8px',
                              color: '#1976D2',
                              fontWeight: '600'
                            }}
                            required
                          />
                          {creditCardAmount && parseFloat(creditCardAmount) > 0 && (
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#1976D2' }}>
                              Entered: ${parseFloat(creditCardAmount).toFixed(2)}
                            </p>
                          )}
                        </div>

                        <div style={{ 
                          padding: '1rem', 
                          background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', 
                          borderRadius: '6px',
                          border: '2px solid #4caf50'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem', color: '#2e7d32', fontWeight: '600' }}>
                              {paymentMethod.toUpperCase()} Card:
                            </span>
                            <span style={{ fontSize: '1rem', color: '#1b5e20', fontWeight: '700' }}>
                              ${(parseFloat(otcEbtAmount) || 0).toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem', color: '#2e7d32', fontWeight: '600' }}>
                              Credit/Debit Card:
                            </span>
                            <span style={{ fontSize: '1rem', color: '#1b5e20', fontWeight: '700' }}>
                              ${(parseFloat(creditCardAmount) || 0).toFixed(2)}
                            </span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            paddingTop: '0.5rem',
                            borderTop: '2px solid #4caf50',
                            marginTop: '0.5rem'
                          }}>
                            <span style={{ fontSize: '1rem', color: '#1b5e20', fontWeight: '700' }}>
                              Total:
                            </span>
                            <span style={{ fontSize: '1.2rem', color: '#1b5e20', fontWeight: '800' }}>
                              ${((parseFloat(otcEbtAmount) || 0) + (parseFloat(creditCardAmount) || 0)).toFixed(2)}
                            </span>
                          </div>
                          {Math.abs(((parseFloat(otcEbtAmount) || 0) + (parseFloat(creditCardAmount) || 0)) - finalTotal) > 0.01 && (
                            <p style={{ 
                              margin: '0.75rem 0 0 0', 
                              fontSize: '0.85rem', 
                              color: '#d32f2f', 
                              fontWeight: '600',
                              textAlign: 'center'
                            }}>
                              ⚠️ Total must equal ${finalTotal.toFixed(2)}
                            </p>
                          )}
                        </div>

                        <p style={{ 
                          margin: '1rem 0 0 0', 
                          fontSize: '0.85rem', 
                          color: '#616161', 
                          fontStyle: 'italic',
                          lineHeight: '1.5',
                          textAlign: 'center'
                        }}>
                          ⚡ After processing your {paymentMethod.toUpperCase()} card, you'll be automatically redirected to Stripe to complete payment for the credit/debit card amount.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {cards.map((card, index) => (
                    <div key={card.id} className="card-form">
                      <div className="card-header">
                        <h4>Card {index + 1}</h4>
                        {useMultipleCards && cards.length > 1 && (
                          <button
                            type="button"
                            className="btn-remove-card"
                            onClick={() => handleRemoveCard(card.id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="form-group">
                        <label>Cardholder Name *</label>
                        <input
                          type="text"
                          value={card.name}
                          onChange={(e) => handleCardChange(card.id, 'name', e.target.value)}
                          required
                          placeholder="Enter cardholder name"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Card Number *</label>
                        <input
                          type="text"
                          value={card.cardNumber}
                          onChange={(e) => {
                            const value = e.target.value;
                            handleCardChange(card.id, 'cardNumber', value);
                          }}
                          required
                          placeholder="Enter card number (any format accepted)"
                        />
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>PIN (Optional)</label>
                          <input
                            type="password"
                            value={card.pin}
                            onChange={(e) => {
                              const value = e.target.value;
                              handleCardChange(card.id, 'pin', value);
                            }}
                            placeholder="Enter PIN (optional - any format accepted)"
                          />
                        </div>
                        
                        {useMultipleCards && (
                          <div className="form-group">
                            <label>Amount for this card *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={finalTotal}
                              value={card.amount}
                              onChange={(e) => {
                                const value = Math.max(0.01, Math.min(finalTotal, parseFloat(e.target.value) || 0));
                                handleCardChange(card.id, 'amount', value);
                              }}
                              required
                              placeholder="0.00"
                            />
                            <small>Remaining: ${(finalTotal - cards.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) + (parseFloat(card.amount) || 0)).toFixed(2)}</small>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {useMultipleCards && (
                    <div className="card-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAddCard}
                      >
                        + Add Another Card
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleDistributeEvenly}
                      >
                        Distribute Evenly
                      </button>
                    </div>
                  )}
                  
                  {useMultipleCards && (
                    <div className="amount-summary">
                      <div className="summary-line">
                        <span>Total from cards:</span>
                        <span>${cards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0).toFixed(2)}</span>
                      </div>
                      <div className="summary-line">
                        <span>Order total:</span>
                        <span>${finalTotal.toFixed(2)}</span>
                      </div>
                      {Math.abs(cards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0) - finalTotal) > 0.01 && (
                        <div className="summary-line error">
                          <span>⚠️ Amount mismatch</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setPaymentMethod('');
                        setShowPaymentForm(false);
                        setUsePartialPayment(false);
                        setRemainingAmount(0);
                      }}
                    >
                      ← Back
                    </button>
                    
                    <button 
                      type="submit" 
                      className="btn btn-primary checkout-btn"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <span className="spinner"></span>
                          Processing Payment...
                        </>
                      ) : usePartialPayment && (parseFloat(creditCardAmount) > 0 || remainingAmount > 0) ? (
                        <>
                          💊 Process {paymentMethod.toUpperCase()} + 💳 Pay ${(parseFloat(creditCardAmount) || remainingAmount).toFixed(2)} via Stripe
                        </>
                      ) : (
                        <>
                          💳 Complete Payment - ${finalTotal.toFixed(2)}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <div className="security-icon">🔒</div>
          <div className="security-text">
            <h4>Secure Checkout</h4>
            <p>Your payment information is encrypted and processed securely through Stripe. We never store your credit card details.</p>
          </div>
        </div>
      </div>

      {/* OTC/EBT Disclaimer Modal */}
      {showDisclaimer && (
        <div className="disclaimer-modal-overlay" onClick={handleDisclaimerCancel}>
          <div className="disclaimer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="disclaimer-header">
              <h2>⚠️ Important Disclaimer</h2>
              <button className="disclaimer-close" onClick={handleDisclaimerCancel}>×</button>
            </div>
            <div className="disclaimer-content">
              <div className="disclaimer-icon">💳</div>
              <h3>OTC/EBT Card Payment Terms</h3>
              <div className="disclaimer-text">
                <p><strong>Please read carefully before proceeding:</strong></p>
                <ul>
                  <li>
                    <strong>Insufficient Balance:</strong> If your card does not have sufficient balance, 
                    it will take time to complete your order. Please ensure your card has enough funds 
                    to cover the order total: <strong>${finalTotal.toFixed(2)}</strong>
                  </li>
                </ul>
                <div className="disclaimer-warning">
                  <strong>⚠️ Important:</strong> Make sure your card has sufficient balance to avoid 
                  order processing delays.
                </div>
              </div>
            </div>
            <div className="disclaimer-actions">
              <button 
                className="btn btn-secondary" 
                onClick={handleDisclaimerCancel}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleDisclaimerAccept}
              >
                I Understand, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Checkout;