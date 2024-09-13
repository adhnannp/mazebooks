document.addEventListener('DOMContentLoaded', function() {
    // Function for Add Category modal
    function setupAddCategoryValidation() {
      const form = document.getElementById('addCategoryForm');
      const categoryNameInput = document.getElementById('CategoryName');
      const categoryNameError = document.getElementById('categoryNameError');

      function validateCategoryName() {
        const categoryName = categoryNameInput.value.trim();

        if (categoryName.length < 4) {
          categoryNameError.innerHTML = 'Category name must be at least 4 characters long';
          categoryNameError.style.display = 'block';
          return false;
        }

        if (categoryName.length !== categoryName.replace(/\s+/g, '').length) {
          categoryNameError.innerHTML = 'Category name must not contain spaces';
          categoryNameError.style.display = 'block';
          return false;
        }

        categoryNameError.innerHTML = '';
        categoryNameError.style.display = 'none';
        return true;
      }

      form.addEventListener('submit', function(event) {
        if (!validateCategoryName()) {
          event.preventDefault();
        }
      });

      categoryNameInput.addEventListener('input', validateCategoryName);
    }

    // Function for Edit Category modal
    function setupEditCategoryValidation(categoryId) {
      const form = document.getElementById(`editCategoryForm${categoryId}`);
      const categoryNameInput = document.getElementById(`CategoryName${categoryId}`);
      const categoryNameError = document.getElementById(`categoryNameError${categoryId}`);

      function validateCategoryName() {
        const categoryName = categoryNameInput.value.trim();

        if (categoryName.length < 4) {
          categoryNameError.innerHTML = 'Category name must be at least 4 characters long';
          categoryNameError.style.display = 'block';
          return false;
        }

        if (categoryName.length !== categoryName.replace(/\s+/g, '').length) {
          categoryNameError.innerHTML = 'Category name must not contain spaces';
          categoryNameError.style.display = 'block';
          return false;
        }

        categoryNameError.innerHTML = '';
        categoryNameError.style.display = 'none';
        return true;
      }

      form.addEventListener('submit', function(event) {
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