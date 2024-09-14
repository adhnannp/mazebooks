document.addEventListener('DOMContentLoaded', function() {
  // Function to get existing categories from hidden inputs
  function getExistingCategories() {
    const categoryElements = document.querySelectorAll('#hiddenCategoryData .existing-category');
    return Array.from(categoryElements).map(el => el.value.toUpperCase()); // Ensure comparison is case-insensitive
  }

  const existingCategories = getExistingCategories();

  function setupAddCategoryValidation() {
    const form = document.getElementById('addCategoryForm');
    const categoryNameInput = document.getElementById('CategoryName');
    const categoryNameError = document.getElementById('categoryNameError');

    function validateCategoryName() {
      const categoryName = categoryNameInput.value.trim();

      // Regular expression to check for valid category names
      const validRegex = /^(?! )[A-Z]{2,}(?: [A-Z]{2,})*$/;
      const lowercaseRegex = /[a-z]/; // Regex to check for lowercase letters

      if (lowercaseRegex.test(categoryName)) {
        categoryNameError.innerHTML = 'No lowercase letters allowed';
        categoryNameError.style.display = 'block';
        return false;
      }

      if (!validRegex.test(categoryName)) {
        categoryNameError.innerHTML = 'Invalid Category Name';
        categoryNameError.style.display = 'block';
        return false;
      }

      if (existingCategories.includes(categoryName.toUpperCase())) {
        categoryNameError.innerHTML = 'Category already exists';
        categoryNameError.style.display = 'block';
        return false;
      }

      categoryNameError.innerHTML = '';
      categoryNameError.style.display = 'none';
      return true;
    }

    form.addEventListener('submit', function(event) {
      // Convert input to uppercase before form submission
      categoryNameInput.value = categoryNameInput.value.toUpperCase();
      
      if (!validateCategoryName()) {
        event.preventDefault();
      }
    });

    categoryNameInput.addEventListener('input', validateCategoryName);
  }

  function setupEditCategoryValidation(categoryId) {
    const form = document.getElementById(`editCategoryForm${categoryId}`);
    const categoryNameInput = document.getElementById(`CategoryName${categoryId}`);
    const categoryNameError = document.getElementById(`categoryNameError${categoryId}`);

    function validateCategoryName() {
      const categoryName = categoryNameInput.value.trim();

      // Regular expression to check for valid category names
      const validRegex = /^(?! )[A-Z]{2,}(?: [A-Z]{2,})*$/;
      const lowercaseRegex = /[a-z]/; // Regex to check for lowercase letters

      if (lowercaseRegex.test(categoryName)) {
        categoryNameError.innerHTML = 'No lowercase letters allowed';
        categoryNameError.style.display = 'block';
        return false;
      }

      if (!validRegex.test(categoryName)) {
        categoryNameError.innerHTML = 'Invalid Category Name';
        categoryNameError.style.display = 'block';
        return false;
      }

      if (existingCategories.includes(categoryName.toUpperCase())) {
        categoryNameError.innerHTML = 'Category already exists';
        categoryNameError.style.display = 'block';
        return false;
      }

      categoryNameError.innerHTML = '';
      categoryNameError.style.display = 'none';
      return true;
    }

    form.addEventListener('submit', function(event) {
      // Convert input to uppercase before form submission
      categoryNameInput.value = categoryNameInput.value.toUpperCase();
      
      if (!validateCategoryName()) {
        event.preventDefault();
      }
    });

    categoryNameInput.addEventListener('input', validateCategoryName);
  }

  // Initialize validation for Add Category modal
  setupAddCategoryValidation();

  // Initialize validation for all Edit Category modals
  document.querySelectorAll('.modal').forEach(modal => {
    if (modal.id.startsWith('editModal')) {
      const categoryId = modal.id.replace('editModal', '');
      setupEditCategoryValidation(categoryId);
    }
  });
});