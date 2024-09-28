document.addEventListener('DOMContentLoaded', function() {
    // Function to get existing coupons from hidden inputs
    function getExistingCoupons() {
      const couponElements = document.querySelectorAll('#hiddenCouponData .existing-coupon');
      return Array.from(couponElements).map(el => el.value.toUpperCase()); // Ensure comparison is case-insensitive
    }
  
    const existingCoupons = getExistingCoupons();
  
    function setupAddCouponValidation() {
      const form = document.getElementById('addCouponForm');
      const couponCodeInput = document.getElementById('CouponCode');
      const maxAmountInput = document.getElementById('MaxAmount');
      const discountPercentageInput = document.getElementById('DiscountPercentage');
      const startDateInput = document.getElementById('StartDate');
      const endDateInput = document.getElementById('EndDate');
  
      const couponCodeError = document.getElementById('couponCodeError');
      const maxAmountError = document.getElementById('maxAmountError');
      const discountPercentageError = document.getElementById('discountPercentageError');
      const startDateError = document.getElementById('startDateError');
      const endDateError = document.getElementById('endDateError');

      // Function to get today's date in YYYY-MM-DD format
      function getToday() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is zero-indexed
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      // Function to validate the Start Date
      function validateStartDate() {
        const today = getToday();
        const startDate = startDateInput.value.trim();

        if (startDate < today) {
          startDateError.innerHTML = 'Start date cannot be past';
          startDateError.style.display = 'block';
          return false;
        }

        startDateError.innerHTML = '';
        startDateError.style.display = 'none';
        return true;
      }

      // Function to validate the End Date
      function validateEndDate() {
        const startDate = startDateInput.value.trim();
        const endDate = endDateInput.value.trim();

        if (endDate <= startDate) {
          endDateError.innerHTML = 'End date cannot be before and same as the start date';
          endDateError.style.display = 'block';
          return false;
        }

        endDateError.innerHTML = '';
        endDateError.style.display = 'none';
        return true;
      }
  
      // Function to validate the Coupon Code
      function validateCouponCode() {
        const couponCode = couponCodeInput.value.trim(); // Do not convert to uppercase here
        const validRegex = /^[A-Z0-9]{6}$/; // Exactly 6 uppercase letters/numbers, no spaces or symbols
        const lowercaseRegex = /[a-z]/; // Check for lowercase letters
      
        // Check if the coupon contains lowercase letters
        if (lowercaseRegex.test(couponCode)) {
          couponCodeError.innerHTML = 'No lowercase letters allowed';
          couponCodeError.style.display = 'block';
          return false;
        }
      
        // Check if the coupon code length is exactly 6 and contains only uppercase letters and numbers
        if (!validRegex.test(couponCode)) {
          couponCodeError.innerHTML = 'exactly 6 characters, only uppercase letters and numbers';
          couponCodeError.style.display = 'block';
          return false;
        }
      
        // Check if the coupon code already exists
        if (existingCoupons.includes(couponCode.toUpperCase())) {
          couponCodeError.innerHTML = 'Coupon code already exists';
          couponCodeError.style.display = 'block';
          return false;
        }
      
        // If all checks pass, hide the error
        couponCodeError.innerHTML = '';
        couponCodeError.style.display = 'none';
        return true;
      }
  
      // Function to validate the Maximum Amount
      function validateMaxAmount() {
        const maxAmount = parseFloat(maxAmountInput.value);
  
        if (isNaN(maxAmount) || maxAmount <= 0) {
          maxAmountError.innerHTML = 'Please enter a valid maximum amount';
          maxAmountError.style.display = 'block';
          return false;
        }
  
        maxAmountError.innerHTML = '';
        maxAmountError.style.display = 'none';
        return true;
      }
  
      // Function to validate Discount Percentage
      function validateDiscountPercentage() {
        const discountPercentage = parseFloat(discountPercentageInput.value);
  
        if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
          discountPercentageError.innerHTML = 'Discount percentage must be between 0 and 100';
          discountPercentageError.style.display = 'block';
          return false;
        }
  
        discountPercentageError.innerHTML = '';
        discountPercentageError.style.display = 'none';
        return true;
      }
  
      // Ensure all required fields are filled before submitting
      form.addEventListener('submit', function(event) {
        couponCodeInput.value = couponCodeInput.value.toUpperCase(); // Convert input to uppercase
  
        if (!validateCouponCode() || !validateMaxAmount() || !validateDiscountPercentage() || !validateStartDate() || !validateEndDate()) {
          event.preventDefault(); // Prevent form submission if validation fails
        }
      });
  
      // Attach real-time validation on input change
      couponCodeInput.addEventListener('input', validateCouponCode);
      maxAmountInput.addEventListener('input', validateMaxAmount);
      discountPercentageInput.addEventListener('input', validateDiscountPercentage);
      startDateInput.addEventListener('change', function() {
        validateStartDate();
        validateEndDate(); // Validate end date as well whenever the start date changes
      });
      endDateInput.addEventListener('change', validateEndDate);
    }
  
    function setupEditCouponValidation(couponId) {
      const form = document.getElementById(`editCouponForm${couponId}`);
      const couponCodeInput = document.getElementById(`CouponCode${couponId}`);
      const maxAmountInput = document.getElementById(`MaxAmount${couponId}`);
      const discountPercentageInput = document.getElementById(`DiscountPercentage${couponId}`);
      const startDateInput = document.getElementById(`StartDate${couponId}`);
      const endDateInput = document.getElementById(`EndDate${couponId}`);
    
      const couponCodeError = document.getElementById(`couponCodeError${couponId}`);
      const maxAmountError = document.getElementById(`maxAmountError${couponId}`);
      const discountPercentageError = document.getElementById(`discountPercentageError${couponId}`);
      const startDateError = document.getElementById(`startDateError${couponId}`);
      const endDateError = document.getElementById(`endDateError${couponId}`);
    
      // Date validation function
      function validateDates() {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Ensure we only compare the date, not time
    
        let valid = true;
    
        // Check if the start date is in the past
        if (startDate < today) {
          startDateError.innerHTML = 'Start date cannot be in the past';
          startDateError.style.display = 'block';
          valid = false;
        } else {
          startDateError.innerHTML = '';
          startDateError.style.display = 'none';
        }
    
        // Check if the end date is earlier than the start date
        if (endDate <= startDate) {
          endDateError.innerHTML = 'End date cannot be before and same as the start date';
          endDateError.style.display = 'block';
          valid = false;
        } else {
          endDateError.innerHTML = '';
          endDateError.style.display = 'none';
        }
    
        return valid;
      }
    
      // Similar validation functions for coupon code, max amount, and discount percentage
      function validateCouponCode() {
        const couponCode = couponCodeInput.value.trim();
        const validRegex = /^[A-Z0-9]{6}$/;
        const lowercaseRegex = /[a-z]/;
    
        if (lowercaseRegex.test(couponCode)) {
          couponCodeError.innerHTML = 'No lowercase letters allowed';
          couponCodeError.style.display = 'block';
          return false;
        }
    
        if (!validRegex.test(couponCode)) {
          couponCodeError.innerHTML = 'Exactly 6 characters, only uppercase letters and numbers';
          couponCodeError.style.display = 'block';
          return false;
        }
    
        if (existingCoupons.includes(couponCode.toUpperCase())) {
          couponCodeError.innerHTML = 'Coupon code already exists';
          couponCodeError.style.display = 'block';
          return false;
        }
    
        couponCodeError.innerHTML = '';
        couponCodeError.style.display = 'none';
        return true;
      }
    
      function validateMaxAmount() {
        const maxAmount = parseFloat(maxAmountInput.value);
        if (isNaN(maxAmount) || maxAmount <= 0) {
          maxAmountError.innerHTML = 'Please enter a valid maximum amount';
          maxAmountError.style.display = 'block';
          return false;
        }
        maxAmountError.innerHTML = '';
        maxAmountError.style.display = 'none';
        return true;
      }
    
      function validateDiscountPercentage() {
        const discountPercentage = parseFloat(discountPercentageInput.value);
        if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
          discountPercentageError.innerHTML = 'Discount percentage must be between 0 and 100';
          discountPercentageError.style.display = 'block';
          return false;
        }
        discountPercentageError.innerHTML = '';
        discountPercentageError.style.display = 'none';
        return true;
      }
    
      form.addEventListener('submit', function(event) {
        couponCodeInput.value = couponCodeInput.value.toUpperCase();
    
        if (
          !validateCouponCode() ||
          !validateMaxAmount() ||
          !validateDiscountPercentage() ||
          !validateDates()
        ) {
          event.preventDefault();
        }
      });
    
      couponCodeInput.addEventListener('input', validateCouponCode);
      maxAmountInput.addEventListener('input', validateMaxAmount);
      discountPercentageInput.addEventListener('input', validateDiscountPercentage);
      startDateInput.addEventListener('input', validateDates);
      endDateInput.addEventListener('input', validateDates);
    }
  
    // Initialize validation for Add Coupon modal
    setupAddCouponValidation();
  
    // Initialize validation for all Edit Coupon modals
    document.querySelectorAll('.modal').forEach(modal => {
      if (modal.id.startsWith('editCouponModal')) {
        const couponId = modal.id.replace('editCouponModal', '');
        setupEditCouponValidation(couponId);
      }
    });
  });
  