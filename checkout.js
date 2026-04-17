/* 
   ================================================================
   CHECKOUT.JS - Checkout Page JavaScript
   ================================================================
   Author: Brittney Lobban
   Student ID: 2406413
   Group Project - Web Programming (CIT2011)
   University of Technology, Jamaica
   
   This file handles:
   Part 4: Checkout Page
     4a. Display order summary (cart items + totals)
     4b. Shipping form with name, address, amount being paid
     4c. Invoice generation on confirmation (see invoice.js / Section 5)
     4d. Confirm button - validates and processes checkout
     4e. Cancel button - returns to cart (handled in HTML via <a> tag)
   
   Also integrates with Section 5: Invoice Generation
     - Generates a unique invoice number
     - Saves invoice to the logged-in user's invoices[] array in RegistrationData
     - Saves invoice to AllInvoices[] in localStorage
     - Optionally displays "invoice sent to email" message
   ================================================================
*/


/* ================================================================
   Q4: CONSTANTS FOR PRICE CALCULATIONS
   ================================================================
   These match the rates used in cart.js so totals are consistent.
   ================================================================ */
var DISCOUNT_RATE = 0.10;   // 10% discount
var TAX_RATE = 0.15;         // 15% GCT
var DELIVERY_FEE = 500;      // J$500 flat delivery fee
var FREE_DELIVERY_THRESHOLD = 5000; // Free delivery above J$5000 subtotal
var checkoutSubmitLocked = false; // Prevent duplicate invoice generation on rapid clicks


/* ================================================================
   Q4 PAGE LOAD EVENT
   ================================================================
   EVENT HANDLING: DOMContentLoaded fires once the page is ready.
   Checks that the user is logged in and has items in their cart
   before allowing them to view the checkout page.
   ================================================================ */
window.addEventListener('DOMContentLoaded', function() {

    // Run checkout logic only on the checkout page.
    // This prevents redirects if this script is accidentally loaded elsewhere.
    var checkoutRoot = document.getElementById('main-content');
    if (!checkoutRoot || !checkoutRoot.classList.contains('checkout-container')) {
        return;
    }

    // --- LOGIN CHECK ---
    // Get the current session from localStorage
    var sessionData = localStorage.getItem('seoulBiteSession');
    var parsedSession = null;

    if (sessionData) {
        try {
            parsedSession = JSON.parse(sessionData);
        } catch (e) {
            parsedSession = null;
        }
    }

    // IF: No session exists, user is not logged in
    if (!parsedSession) {
        alert('You must be logged in to checkout. Redirecting to login page.');
        window.location.href = 'index.html';
        return; // Stop function from running further
    }

    // --- CART CHECK ---
    // Get the cart from localStorage and parse it from JSON string to array
    var cart = JSON.parse(localStorage.getItem('seoulBiteCart')) || [];

    // IF: Cart is empty, nothing to checkout
    if (cart.length === 0) {
        alert('Your cart is empty! Add items before checking out.');
        window.location.href = 'products.html';
        return;
    }

    // --- DISPLAY SUMMARY ---
    // Call function to show order items and totals on the page
    displayOrderSummary();

    // --- PRE-FILL SHIPPING FIELDS ---
    // If user data is available in RegistrationData, pre-fill name and phone
    preFillShippingFromRegistration(parsedSession);

    // --- PAYMENT METHOD EVENT LISTENERS ---
    // Set up listeners to show/hide card fields based on selected payment
    setupPaymentOptions();

    // --- CARD FORMATTING ---
    // Format card number and expiry date as user types
    setupCardFormatting();

    // --- DONE BUTTON ---
    // Set up the "Continue Shopping" button in the confirmation modal
    var doneBtn = document.getElementById('done-btn');
    if (doneBtn) {
        doneBtn.addEventListener('click', function() {
            window.location.href = 'products.html';
        });
    }
});


/* ================================================================
   Q4a: DISPLAY ORDER SUMMARY FUNCTION
   ================================================================
   Reads cart and totals from localStorage and builds the HTML
   to display them in the order summary section on the page.
   
   Uses: seoulBiteCart, seoulBiteOrderTotals (from cart.js)
   ================================================================ */
function displayOrderSummary() {

    // Get cart items from localStorage
    var cart = JSON.parse(localStorage.getItem('seoulBiteCart')) || [];

    // Get pre-calculated totals saved by cart.js
    var totals = JSON.parse(localStorage.getItem('seoulBiteOrderTotals')) || {};

    // Get the container where we will show the items
    var orderItemsContainer = document.getElementById('order-items');

    // Build the HTML string for the item list using a FOR LOOP
    var itemsHTML = '';

    // LOOP: Go through every item in the cart array
    for (var i = 0; i < cart.length; i++) {

        // Get the current item
        var item = cart[i];

        // ARITHMETIC: Calculate this item's line total (price × quantity)
        var lineTotal = item.price * item.quantity;

        // STRING CONCATENATION: Build a row for this item
        itemsHTML += '<div class="order-item">' +
            '<div class="order-item-info">' +
                '<span class="order-item-name">' + item.name + '</span>' +
                '<span class="order-item-qty">× ' + item.quantity + '</span>' +
            '</div>' +
            '<span class="order-item-price">J$' + lineTotal.toLocaleString() + '</span>' +
        '</div>';
    }

    // DOM MANIPULATION: Inject the built HTML into the container
    orderItemsContainer.innerHTML = itemsHTML;

    // DOM MANIPULATION: Update each total display field
    // Use totals from localStorage if available, otherwise recalculate
    if (Object.keys(totals).length > 0) {
        document.getElementById('summary-subtotal').textContent = 'J$' + totals.subtotal.toLocaleString();
        document.getElementById('summary-discount').textContent  = '- J$' + totals.discount.toLocaleString();
        document.getElementById('summary-tax').textContent       = 'J$' + totals.tax.toLocaleString();
        document.getElementById('summary-delivery').textContent  = totals.deliveryFee === 0 ? 'FREE' : 'J$' + totals.deliveryFee.toLocaleString();
        document.getElementById('summary-total').textContent     = 'J$' + totals.total.toLocaleString();
    } else {
        // Fallback: Recalculate totals from cart if seoulBiteOrderTotals is missing
        recalculateAndDisplayTotals(cart);
    }
}


/* ================================================================
   RECALCULATE TOTALS (Fallback)
   ================================================================
   If seoulBiteOrderTotals is not in localStorage (e.g., user navigated
   here directly), this function recalculates everything from the cart.
   ================================================================ */
function recalculateAndDisplayTotals(cart) {

    // ARITHMETIC: Sum up all item totals using a FOR LOOP
    var subtotal = 0;
    for (var i = 0; i < cart.length; i++) {
        subtotal += cart[i].price * cart[i].quantity;
    }

    var discount    = Math.round(subtotal * DISCOUNT_RATE);
    var tax         = Math.round((subtotal - discount) * TAX_RATE);
    var deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    var total       = Math.round(subtotal - discount + tax + deliveryFee);

    // DOM MANIPULATION: Update the display fields
    document.getElementById('summary-subtotal').textContent = 'J$' + subtotal.toLocaleString();
    document.getElementById('summary-discount').textContent  = '- J$' + discount.toLocaleString();
    document.getElementById('summary-tax').textContent       = 'J$' + tax.toLocaleString();
    document.getElementById('summary-delivery').textContent  = deliveryFee === 0 ? 'FREE' : 'J$' + deliveryFee.toLocaleString();
    document.getElementById('summary-total').textContent     = 'J$' + total.toLocaleString();

    // Save the recalculated totals back so generateInvoice() can use them
    localStorage.setItem('seoulBiteOrderTotals', JSON.stringify({
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        deliveryFee: deliveryFee,
        total: total
    }));
}


/* ================================================================
   PRE-FILL SHIPPING FROM REGISTRATION DATA
   ================================================================
   Looks up the logged-in user in RegistrationData and pre-fills
   the full name and phone fields to save them time.
   ================================================================ */
function preFillShippingFromRegistration(session) {

    // Try to find the user in RegistrationData using their trn
    var registrationData = JSON.parse(localStorage.getItem('RegistrationData')) || [];

    // LOOP: Search for matching TRN
    var foundUser = null;
    for (var i = 0; i < registrationData.length; i++) {
        if (registrationData[i].trn === session.trn) {
            foundUser = registrationData[i];
            break; // Stop loop once found
        }
    }

    // IF: User found in RegistrationData, pre-fill the fields
    if (foundUser) {
        document.getElementById('fullName').value = foundUser.firstName + ' ' + foundUser.lastName;
        document.getElementById('phone').value    = foundUser.phone;
    } else if (session.fullName) {
        // Fallback: use session data if RegistrationData entry not found
        document.getElementById('fullName').value = session.fullName;
    }
}


/* ================================================================
   Q4b: SETUP PAYMENT OPTIONS
   ================================================================
   EVENT HANDLING: Add 'change' listeners to the payment radio buttons.
   Shows or hides card detail fields based on what the user selects.
   ================================================================ */
function setupPaymentOptions() {

    // DOM MANIPULATION: Get all radio buttons inside payment-options
    var paymentRadios = document.querySelectorAll('input[name="payment"]');
    var cardDetailsDiv = document.getElementById('card-details');

    // FOR LOOP: Attach a listener to each radio button
    for (var i = 0; i < paymentRadios.length; i++) {

        // EVENT HANDLING: 'change' fires when a different radio is selected
        paymentRadios[i].addEventListener('change', function() {

            // DOM MANIPULATION: Remove 'selected' class from all labels
            var allLabels = document.querySelectorAll('.payment-option');
            for (var j = 0; j < allLabels.length; j++) {
                allLabels[j].classList.remove('selected');
            }

            // DOM MANIPULATION: Add 'selected' to the clicked radio's parent label
            // 'this' refers to the specific radio that was changed
            this.parentElement.classList.add('selected');

            // IF/ELSE: Show card fields only if card payment selected
            if (this.value === 'card') {
                cardDetailsDiv.classList.remove('hidden');
            } else {
                cardDetailsDiv.classList.add('hidden');
            }
        });
    }
}


/* ================================================================
   SETUP CARD FORMATTING
   ================================================================
   EVENT HANDLING: Format card number (xxxx xxxx xxxx xxxx)
   and expiry date (MM/YY) as the user types.
   ================================================================ */
function setupCardFormatting() {

    // Card number formatting
    var cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function() {
            // Remove all non-digit characters first
            var digits = this.value.replace(/\D/g, '');
            // Insert a space after every 4 digits
            this.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
        });
    }

    // Expiry date formatting
    var expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function() {
            var digits = this.value.replace(/\D/g, '');
            // If 2 or more digits, insert slash after first 2
            if (digits.length >= 2) {
                this.value = digits.slice(0, 2) + '/' + digits.slice(2, 4);
            } else {
                this.value = digits;
            }
        });
    }
}


/* ================================================================
   Q4d: CONFIRM CHECKOUT FUNCTION
   ================================================================
   Called when user clicks the "Confirm Order" button.
   Validates all form fields then calls generateInvoice() if valid.
   ================================================================ */
function confirmCheckout() {

    // Ignore repeated clicks while checkout is already being processed.
    if (checkoutSubmitLocked) {
        return;
    }

    // STEP 1: Run form validation
    var isValid = validateCheckoutForm();

    // IF: Form is not valid, stop here (errors already shown on page)
    if (!isValid) {
        return;
    }

    checkoutSubmitLocked = true;

    var confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing...';
    }

    // STEP 2: If everything is valid, generate the invoice
    try {
        generateInvoice();
    } catch (error) {
        checkoutSubmitLocked = false;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Order';
        }
        alert('Something went wrong while processing checkout. Please try again.');
    }
}


/* ================================================================
   Q4b: VALIDATE CHECKOUT FORM
   ================================================================
   FORM VALIDATION: Checks all required shipping and payment fields.
   Returns true if all pass, false if any fail.
   Uses showError() to display messages under problem fields.
   ================================================================ */
function validateCheckoutForm() {

    // Start assuming valid - set to false if any check fails
    var isValid = true;

    // Clear all previous errors first
    clearAllErrors();

    /* ----------------------------------------------------------
       VALIDATE: Full Name - must not be empty
       ---------------------------------------------------------- */
    var fullName = document.getElementById('fullName').value.trim();
    if (fullName === '') {
        showError('fullName', 'Full name is required.');
        isValid = false;
    }

    /* ----------------------------------------------------------
       VALIDATE: Phone - must not be empty and have valid format
       ---------------------------------------------------------- */
    var phone = document.getElementById('phone').value.trim();
    if (phone === '') {
        showError('phone', 'Phone number is required.');
        isValid = false;
    } else if (!/^[\d\s\-\+\(\)]{7,}$/.test(phone)) {
        // Regex: must contain at least 7 digit/formatting characters
        showError('phone', 'Enter a valid phone number (at least 7 digits).');
        isValid = false;
    }

    /* ----------------------------------------------------------
       VALIDATE: Address - must not be empty
       ---------------------------------------------------------- */
    var address = document.getElementById('address').value.trim();
    if (address === '') {
        showError('address', 'Delivery address is required.');
        isValid = false;
    }

    /* ----------------------------------------------------------
       VALIDATE: Parish - must have a selection
       ---------------------------------------------------------- */
    var parish = document.getElementById('parish').value;
    if (parish === '') {
        showError('parish', 'Please select a parish.');
        isValid = false;
    }

    /* ----------------------------------------------------------
       VALIDATE: Amount Being Paid - must not be empty and >= total
       ---------------------------------------------------------- */
    var amountPaid = parseFloat(document.getElementById('amountPaid').value);
    var totals = JSON.parse(localStorage.getItem('seoulBiteOrderTotals')) || {};
    var orderTotal = totals.total || 0;

    if (isNaN(amountPaid) || amountPaid <= 0) {
        showError('amountPaid', 'Please enter the amount you are paying.');
        isValid = false;
    } else if (amountPaid < orderTotal) {
        // Amount must cover the total cost
        showError('amountPaid', 'Amount must be at least J$' + orderTotal.toLocaleString() + '.');
        isValid = false;
    }

    /* ----------------------------------------------------------
       VALIDATE CARD FIELDS (only if card payment is selected)
       ---------------------------------------------------------- */
    var selectedPaymentRadio = document.querySelector('input[name="payment"]:checked');
    if (!selectedPaymentRadio) {
        alert('Please select a payment method.');
        return false;
    }

    var selectedPayment = selectedPaymentRadio.value;

    if (selectedPayment === 'card') {

        // Card Number: must be 13-19 digits
        var cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        if (cardNumber === '') {
            showError('cardNumber', 'Card number is required.');
            isValid = false;
        } else if (!/^\d{13,19}$/.test(cardNumber)) {
            showError('cardNumber', 'Please enter a valid card number (13-19 digits).');
            isValid = false;
        }

        // Cardholder Name: must not be empty
        var cardName = document.getElementById('cardName').value.trim();
        if (cardName === '') {
            showError('cardName', 'Cardholder name is required.');
            isValid = false;
        }

        // Expiry: must match MM/YY format
        var expiry = document.getElementById('expiry').value;
        if (expiry === '') {
            showError('expiry', 'Expiry date is required.');
            isValid = false;
        } else if (!/^\d{2}\/\d{2}$/.test(expiry)) {
            showError('expiry', 'Use format MM/YY (e.g. 08/27).');
            isValid = false;
        }

        // CVV: must be 3 or 4 digits
        var cvv = document.getElementById('cvv').value;
        if (cvv === '') {
            showError('cvv', 'CVV is required.');
            isValid = false;
        } else if (!/^\d{3,4}$/.test(cvv)) {
            showError('cvv', 'CVV must be 3 or 4 digits.');
            isValid = false;
        }
    }

    return isValid;
}


/* ================================================================
   SECTION 5: GENERATE INVOICE FUNCTION
   ================================================================
   Called after a successful checkout validation.
   
   Creates a full invoice object containing:
   - Company name
   - Date of invoice
   - Unique invoice number
   - TRN of the customer
   - Shipping information (from checkout form)
   - Purchased items (name, quantity, price, discount)
   - Taxes, subtotal, total cost
   
   Saves invoice to:
   1. The user's invoices[] array inside RegistrationData
   2. AllInvoices[] array in localStorage
   
   Then shows a confirmation modal.
   ================================================================ */
function generateInvoice() {
    var selectedPaymentRadio = document.querySelector('input[name="payment"]:checked');
    var selectedPayment = selectedPaymentRadio ? selectedPaymentRadio.value : 'cod';


    // --- GET DATA FROM LOCALSTORAGE ---
    var cart      = JSON.parse(localStorage.getItem('seoulBiteCart'))        || [];
    var totals    = JSON.parse(localStorage.getItem('seoulBiteOrderTotals')) || {};
    var sessionData = JSON.parse(localStorage.getItem('seoulBiteSession'))   || {};

    // --- GET SHIPPING DETAILS FROM THE FORM ---
    var shippingDetails = {
        fullName     : document.getElementById('fullName').value.trim(),
        phone        : document.getElementById('phone').value.trim(),
        address      : document.getElementById('address').value.trim(),
        parish       : document.getElementById('parish').value,
        amountPaid   : parseFloat(document.getElementById('amountPaid').value),
        instructions : document.getElementById('instructions').value.trim()
    };

    // --- GENERATE UNIQUE INVOICE NUMBER ---
    // Format: SB-[timestamp]-[random 3-digit number]
    var timestamp  = Date.now().toString().slice(-6);
    var randomPart = Math.floor(Math.random() * 900) + 100; // 100-999
    var invoiceNumber = 'SB-' + timestamp + '-' + randomPart;

    // --- GET CURRENT DATE AND TIME ---
    var now = new Date();
    var invoiceDate = now.toLocaleDateString('en-JM', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    // --- BUILD PURCHASED ITEMS ARRAY ---
    // Each item includes name, quantity, unit price, line total, and discount applied
    var purchasedItems = [];
    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        // ARITHMETIC: Calculate the discount portion for each item proportionally
        var itemSubtotal = item.price * item.quantity;
        var itemDiscount = Math.round(itemSubtotal * DISCOUNT_RATE);

        purchasedItems.push({
            name      : item.name,
            quantity  : item.quantity,
            unitPrice : item.price,
            lineTotal : itemSubtotal,
            discount  : itemDiscount
        });
    }

    // --- ASSEMBLE THE FULL INVOICE OBJECT ---
    var invoice = {
        invoiceNumber : invoiceNumber,
        companyName   : 'Seoul Bite',
        dateOfInvoice : invoiceDate,
        dateISO       : now.toISOString(),
        trn           : sessionData.trn || 'N/A',
        customerName  : shippingDetails.fullName,
        shipping      : shippingDetails,
        items         : purchasedItems,
        subtotal      : totals.subtotal   || 0,
        discount      : totals.discount   || 0,
        tax           : totals.tax        || 0,
        deliveryFee   : totals.deliveryFee || 0,
        total         : totals.total      || 0,
        amountPaid    : shippingDetails.amountPaid,
        changeDue     : shippingDetails.amountPaid - (totals.total || 0),
        paymentMethod : selectedPayment
    };

    // ============================================================
    // SAVE TO AllInvoices IN LOCALSTORAGE
    // ============================================================
    // Get existing AllInvoices array (or empty array if none exist)
    var allInvoices = JSON.parse(localStorage.getItem('AllInvoices')) || [];

    // Append the new invoice to the array
    allInvoices.push(invoice);

    // Save the updated array back to localStorage as a JSON string
    localStorage.setItem('AllInvoices', JSON.stringify(allInvoices));

    // ============================================================
    // SAVE TO USER'S invoices[] IN RegistrationData
    // ============================================================
    // Get RegistrationData (the assignment's required key)
    var registrationData = JSON.parse(localStorage.getItem('RegistrationData')) || [];

    // Flag to track if we found the user
    var userFound = false;

    // LOOP: Search RegistrationData for the logged-in user by TRN
    for (var j = 0; j < registrationData.length; j++) {
        if (registrationData[j].trn === sessionData.trn) {

            // Make sure the user has an invoices array
            if (!Array.isArray(registrationData[j].invoices)) {
                registrationData[j].invoices = [];
            }

            // Append this invoice to the user's invoices array
            registrationData[j].invoices.push(invoice);
            userFound = true;
            break; // Stop looping once we find the user
        }
    }

    // If TRN wasn't found in RegistrationData, try seoulBiteUsers as fallback
    if (!userFound) {
        var seoulUsers = JSON.parse(localStorage.getItem('seoulBiteUsers')) || [];
        for (var k = 0; k < seoulUsers.length; k++) {
            if (seoulUsers[k].username === sessionData.username ||
                seoulUsers[k].email    === sessionData.email) {

                if (!Array.isArray(seoulUsers[k].invoices)) {
                    seoulUsers[k].invoices = [];
                }
                seoulUsers[k].invoices.push(invoice);
                break;
            }
        }
        localStorage.setItem('seoulBiteUsers', JSON.stringify(seoulUsers));
    }

    // Save the updated RegistrationData back to localStorage
    localStorage.setItem('RegistrationData', JSON.stringify(registrationData));

    // ============================================================
    // ALSO SAVE TO seoulBiteOrders for backward compatibility
    // with the rest of the IA project
    // ============================================================
    var existingOrders = JSON.parse(localStorage.getItem('seoulBiteOrders')) || [];
    existingOrders.push({
        orderNumber : invoiceNumber,
        items       : cart,
        totals      : totals,
        shipping    : shippingDetails,
        createdAt   : now.toISOString()
    });
    localStorage.setItem('seoulBiteOrders', JSON.stringify(existingOrders));

    // ============================================================
    // CLEAR THE CART AFTER SUCCESSFUL CHECKOUT
    // ============================================================
    localStorage.removeItem('seoulBiteCart');
    localStorage.removeItem('seoulBiteOrderTotals');

    // ============================================================
    // SHOW CONFIRMATION MODAL (Section 5c - email sent message)
    // ============================================================
    // DOM MANIPULATION: Display the invoice number in the modal
    document.getElementById('invoice-number-display').textContent = invoiceNumber;

    // DOM MANIPULATION: Show the confirmation modal
    document.getElementById('confirmation-modal').classList.add('show');

    // LOG the invoice to console for debugging (also satisfies ShowInvoices requirement)
    console.log('=== INVOICE GENERATED ===');
    console.log(invoice);
    console.log('=== ALL INVOICES ===');
    console.log(JSON.parse(localStorage.getItem('AllInvoices')));
}


/* ================================================================
   SHOW ERROR FUNCTION
   ================================================================
   DOM MANIPULATION: Highlights a field and shows an error message.
   
   @param {string} fieldId  - The id of the input field
   @param {string} message  - The error text to display
   ================================================================ */
function showError(fieldId, message) {

    // Get the input element
    var input = document.getElementById(fieldId);

    // Get the corresponding error message element (id: fieldId + '-error')
    var errorEl = document.getElementById(fieldId + '-error');

    // DOM MANIPULATION: Add red border class to the input
    if (input) {
        input.classList.add('input-error');
    }

    // DOM MANIPULATION: Set the error message text and make it visible
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}


/* ================================================================
   CLEAR ALL ERRORS FUNCTION
   ================================================================
   DOM MANIPULATION: Removes all error highlights and messages
   before re-validating the form.
   ================================================================ */
function clearAllErrors() {

    // Get all error message elements on the page
    var errorMessages = document.querySelectorAll('.error-message');

    // FOR LOOP: Clear and hide each one
    for (var i = 0; i < errorMessages.length; i++) {
        errorMessages[i].textContent = '';
        errorMessages[i].classList.remove('show');
    }

    // Get all inputs that currently have the error styling
    var errorInputs = document.querySelectorAll('.input-error');

    // FOR LOOP: Remove the error class from each
    for (var j = 0; j < errorInputs.length; j++) {
        errorInputs[j].classList.remove('input-error');
    }
}


// Console confirmation that the script loaded correctly
console.log('checkout.js (Part 4) loaded successfully.');
