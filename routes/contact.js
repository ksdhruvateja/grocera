const express = require('express');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const { authenticate: auth, authorize } = require('../middleware/security');
const adminAuth = [auth, authorize(['admin'])];

const router = express.Router();

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail', // or your preferred email service
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS  // Your app password
    }
  });
};

// Submit contact form
router.post('/submit', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('subject').trim().isLength({ min: 5 }).withMessage('Subject must be at least 5 characters'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, subject, message } = req.body;

    // Save to database
    const contact = new Contact({
      name,
      email,
      phone: phone || '',
      subject,
      message
    });

    await contact.save();

    // Send email notification
    try {
      const transporter = createTransporter();

      // Email to admin
      const adminMailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject: `New Contact Form Submission: ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><em>Submitted on ${new Date().toLocaleString()}</em></p>
        `
      };

      // Confirmation email to user
      const userMailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Thank you for contacting RB\'s Grocery',
        html: `
          <h2>Thank you for contacting us!</h2>
          <p>Dear ${name},</p>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <p><strong>Your Message:</strong></p>
          <p><em>${subject}</em></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p>Best regards,<br>zippyyy Team</p>
        `
      };

      await Promise.all([
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(userMailOptions)
      ]);

      console.log('Contact form emails sent successfully');
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      message: 'Contact form submitted successfully. We will get back to you soon!',
      contactId: contact._id
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({ message: 'Server error submitting contact form' });
  }
});

// Get all contact submissions (Admin only)
router.get('/all', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(query);

    res.json({
      contacts,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalContacts: total
    });
  } catch (error) {
    console.error('Contacts fetch error:', error);
    res.status(500).json({ message: 'Server error fetching contacts' });
  }
});

// Get single contact submission (Admin only)
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact submission not found' });
    }

    // Mark as read if it's new
    if (contact.status === 'new') {
      contact.status = 'read';
      await contact.save();
    }

    res.json({ contact });
  } catch (error) {
    console.error('Contact fetch error:', error);
    res.status(500).json({ message: 'Server error fetching contact' });
  }
});

// Respond to contact submission (Admin only)
router.post('/:id/respond', adminAuth, [
  body('response').trim().isLength({ min: 10 }).withMessage('Response must be at least 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { response } = req.body;
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact submission not found' });
    }

    // Update contact record
    contact.response = response;
    contact.status = 'responded';
    contact.respondedAt = new Date();
    contact.respondedBy = req.user._id;
    await contact.save();

    // Send response email
    try {
      const transporter = createTransporter();

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: contact.email,
        subject: `Re: ${contact.subject}`,
        html: `
          <h2>Response from zippyyy</h2>
          <p>Dear ${contact.name},</p>
          <p>Thank you for reaching out to us. Here's our response to your inquiry:</p>
          <hr>
          <p><strong>Your original message:</strong></p>
          <p><em>${contact.subject}</em></p>
          <p>${contact.message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><strong>Our response:</strong></p>
          <p>${response.replace(/\n/g, '<br>')}</p>
          <hr>
          <p>Best regards,<br>zippyyy Team</p>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('Response email sent successfully');
    } catch (emailError) {
      console.error('Response email error:', emailError);
    }

    res.json({
      message: 'Response sent successfully',
      contact
    });
  } catch (error) {
    console.error('Contact response error:', error);
    res.status(500).json({ message: 'Server error sending response' });
  }
});

// Update contact status (Admin only)
router.patch('/:id/status', adminAuth, [
  body('status').isIn(['new', 'read', 'responded', 'closed']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact submission not found' });
    }

    contact.status = status;
    await contact.save();

    res.json({
      message: 'Contact status updated successfully',
      contact
    });
  } catch (error) {
    console.error('Contact status update error:', error);
    res.status(500).json({ message: 'Server error updating contact status' });
  }
});

module.exports = router;