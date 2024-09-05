let cropper;
let croppedImages = []; // Array to hold cropped images
let currentImageIndex; // Track which image is currently being cropped

// Function to handle image cropping and preview
function handleCropper(imageIndex, file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const image = document.getElementById('cropperImage');
        image.src = e.target.result;
        
        // Initialize cropper
        if (cropper) cropper.destroy(); // Destroy the previous cropper if it exists
        cropper = new Cropper(image, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1
        });

        // Store the current image index being cropped
        currentImageIndex = imageIndex;
        document.getElementById('cropperContainer').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Event handler for cropping button
document.getElementById('cropButton').addEventListener('click', function() {
    if (cropper) {
        const croppedCanvas = cropper.getCroppedCanvas();
        const croppedImageURL = croppedCanvas.toDataURL('image/jpeg');
        
        // Update the cropped image preview
        document.getElementById(`imagePreview${currentImageIndex}`).src = croppedImageURL;
        
        // Save the cropped image in the array
        croppedImages[currentImageIndex] = croppedImageURL;

        // Hide the cropping container
        document.getElementById('cropperContainer').style.display = 'none';
    }
});


// When 'Upload' button is clicked, trigger the file input click
document.getElementById('triggerUpload').addEventListener('click', function() {
    document.getElementById('productImages').click();
});

// Event handler for image selection
document.getElementById('productImages').addEventListener('change', function(event) {
    const files = event.target.files;
    if ( !files || files.length !== 3) {
        document.getElementById('imageError').style.display = 'block';
        return;
    }

    document.getElementById('imageError').style.display = 'none';

    for (let i = 0; i < 3; i++) {
        const file = files[i];
        const previewContainer = document.getElementById('imagePreviewContainer');
        
        // Create or update the preview image element
        let imgPreview = document.getElementById(`imagePreview${i}`);
        if (!imgPreview) {
            imgPreview = document.createElement('img');
            imgPreview.id = `imagePreview${i}`;
            imgPreview.style.maxWidth = '100px';
            imgPreview.style.maxHeight = '100px';
            imgPreview.style.marginRight = '10px';
            previewContainer.appendChild(imgPreview);
        }

        // Apply hover effect and cursor change in JS
        imgPreview.addEventListener('mouseover', function() {
            imgPreview.style.transform = 'scale(1.1)';
            imgPreview.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            imgPreview.style.cursor = 'pointer';
        });

        imgPreview.addEventListener('mouseout', function() {
            imgPreview.style.transform = 'scale(1)';
            imgPreview.style.boxShadow = 'none';
        });

        // Start cropping when clicking the image
        imgPreview.addEventListener('click', () => handleCropper(i, file));
        
        // Show the original image preview before cropping
        const reader = new FileReader();
        reader.onload = function(e) {
            imgPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Event handler for cancel cropping button
document.getElementById('addProductForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    const formData = new FormData(this);

    // Append cropped images if available
    croppedImages.forEach((croppedImage, index) => {
        if (croppedImage) {
            const blob = dataURLtoBlob(croppedImage); // Convert base64 to Blob
            formData.append(`croppedImage${index}`, blob, `croppedImage${index}.jpg`);
        }
    });

    fetch('/admin/products/add', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Form submitted successfully:', data);
        $('#addProductModal').modal('hide'); // Hide the modal after submission
        location.reload();
    })
    .catch(error => {
        console.error('Error submitting form:', error);
    });
});

function dataURLtoBlob(dataURL) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}